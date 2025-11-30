import { Suspense, memo, useMemo } from 'react';
import { Spinner, Image, type JSXElement } from '@fluentui/react-components';
import {
  ReferenceList,
  ReferenceOverflowButton,
  generateReferenceCitationPreview,
} from "@fluentui-copilot/react-reference";
import { CopilotMessage } from '@fluentui-copilot/react-copilot-chat';
import { Markdown } from '../core/Markdown';
import { AgentIcon } from '../core/AgentIcon';
import { UsageInfo } from './UsageInfo';
import { useFormatTimestamp } from '../../hooks/useFormatTimestamp';
import type { IChatItem } from '../../types/chat';
import styles from './AssistantMessage.module.css';

interface AssistantMessageProps {
  message: IChatItem;
  agentName?: string;
  agentLogo?: string;
  isStreaming?: boolean;
}

function AssistantMessageComponent({ 
  message, 
  agentName = 'مساعد ديوان الخدمة المدنية',
  agentLogo,
  isStreaming = false,
}: AssistantMessageProps) {
  const formatTimestamp = useFormatTimestamp();
  const timestamp = message.more?.time ? formatTimestamp(new Date(message.more.time)) : '';
  
  // Show custom loading indicator when streaming with no content
  const showLoadingDots = isStreaming && !message.content;
  
  // Generate reference components from message citations
  const referenceComponents = useMemo(() => {
    if (!message.citations || message.citations.length === 0) {
      return [];
    }

    const references: JSXElement[] = [];
    
    for (let i = 0; i < message.citations.length; i++) {
      const citation = message.citations[i];
      const { Reference } = generateReferenceCitationPreview({
        index: i + 1,
        referenceProps: {
          target: "_blank",
          rel: "noopener noreferrer",
          children: citation.title || citation.uri,
          href: citation.uri,
          graphic: (
            <Image
              alt="Document"
              height={16}
              src="https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/item-types/16/genericfile.svg"
              width={16}
            />
          ),
        },
      });
      references.push(<Reference key={`citation-${message.id}-${i}`} />);
    }
    
    return references;
  }, [message.citations, message.id]);
  
  return (
    <CopilotMessage
      id={`msg-${message.id}`}
      avatar={<AgentIcon logoUrl={agentLogo} />}
      name={agentName}
      loadingState="none"
      className={styles.copilotMessage}
      disclaimer={<span>المحتوى المُنشأ بواسطة الذكاء الاصطناعي قد يكون غير دقيق</span>}
      footnote={
        <>
          {timestamp && <span className={styles.timestamp}>{timestamp}</span>}
          {message.more?.usage && (
            <UsageInfo 
              info={message.more.usage} 
              duration={message.duration} 
            />
          )}
          {referenceComponents.length > 0 && (
            <ReferenceList
              maxVisibleReferences={2}
              showLessButton={
                <ReferenceOverflowButton>Show less</ReferenceOverflowButton>
              }
              showMoreButton={
                <ReferenceOverflowButton
                  text={(overflowCount) => `+${overflowCount}`}
                />
              }
            >
              {referenceComponents}
            </ReferenceList>
          )}
        </>
      }
    >
      {showLoadingDots ? (
        <div className={styles.loadingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <Suspense fallback={<Spinner size="small" />}>
          <Markdown content={message.content} />
        </Suspense>
      )}
    </CopilotMessage>
  );
}

export const AssistantMessage = memo(AssistantMessageComponent, (prev, next) => {
  // Re-render only if streaming state or content/usage/citations changes
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.isStreaming === next.isStreaming &&
    prev.agentLogo === next.agentLogo &&
    prev.message.more?.usage === next.message.more?.usage &&
    prev.message.citations === next.message.citations
  );
});
