import { memo } from 'react';
import type { ICitation } from '../../types/chat';
import styles from './Citations.module.css';

interface CitationsProps {
  citations: ICitation[];
}

function CitationsComponent({ citations }: CitationsProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className={styles.citationsContainer} role="region" aria-label="Citations">
      <div className={styles.citationsTitle}>المصادر</div>
      <ol className={styles.citationsList}>
        {citations.map((citation, index) => (
          <li key={index} className={styles.citationItem}>
            <span className={styles.citationNumber} aria-label={`Source ${index + 1}`}>
              {index + 1}
            </span>
            <a
              href={citation.uri}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.citationLink}
              title={citation.title || citation.uri}
            >
              {citation.title && (
                <span className={styles.citationTitle}>{citation.title}</span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const Citations = memo(CitationsComponent);
