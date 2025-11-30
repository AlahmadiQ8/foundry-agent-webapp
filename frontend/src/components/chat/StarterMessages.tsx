import type { ReactNode } from 'react';
import { Body1, Subtitle1, Button } from '@fluentui/react-components';
import { AgentIcon } from '../core/AgentIcon';
import styles from './StarterMessages.module.css';

interface IStarterMessageProps {
  agentName?: string;
  agentDescription?: string;
  agentLogo?: string;
  onPromptClick?: (prompt: string) => void;
}

// NOTE: Starter prompts are hardcoded here (not fetched from Azure AI Foundry)
// Customize these based on your agent's capabilities
// The Azure sample also uses hardcoded prompts in the frontend
const defaultStarterPrompts = [
  "ما هي الاجازات المتاحة للموظف لسنة 2025؟",
  "ما هي البدلات المتوفرة لكل مسمى وظيفي؟",
  "كيف يمكنك مساعدتي؟",
];

export const StarterMessages = ({
  agentName,
  agentDescription,
  agentLogo,
  onPromptClick,
}: IStarterMessageProps): ReactNode => {
  return (
    <div className={styles.zeroprompt}>
      <div className={styles.content}>
        <AgentIcon
          alt={agentName ?? "Agent"}
          size="large"
          logoUrl={agentLogo}
        />
        <Subtitle1 className={styles.welcome}>
          مرحباً! أنا مساعدك الرقمي في ديوان الخدمة المدنية
        </Subtitle1>
        {agentDescription && (
          <Body1 className={styles.caption}>{agentDescription}</Body1>
        )}
      </div>

      {onPromptClick && (
        <div className={styles.promptStarters}>
          {defaultStarterPrompts.map((prompt, index) => (
            <Button
              key={`prompt-${index}`}
              appearance="subtle"
              onClick={() => onPromptClick(prompt)}
            >
              <Body1>{prompt}</Body1>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
