import { useId } from 'react';
import { analyzeRelationship } from '../domain/effortAnalysis.js';

/**
 * Read-only presentation. The parent owns the canonical phase and effort log.
 */
export function EffortAnalysis({ phase, effortLog }) {
  const titleId = useId();
  const { emScore, rivalScore, redFlagWarning } = analyzeRelationship(phase, effortLog);

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>Effort analysis</h2>
      <dl>
        <dt>Em score</dt>
        <dd>{emScore}</dd>
        <dt>Ai đó score</dt>
        <dd>{rivalScore}</dd>
      </dl>
      <output role="status" aria-live="polite">
        {redFlagWarning
          ? 'Red Flag: Hẹn hò nhưng không yêu — effort is unequal.'
          : 'No red flag detected.'}
      </output>
    </section>
  );
}
