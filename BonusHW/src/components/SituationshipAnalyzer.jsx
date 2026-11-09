import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { RelationshipEvent, RelationshipPhase } from '../domain/relationshipMachine.js';
import {
  EffortAction,
  EffortActor,
  EFFORT_MULTIPLIER,
  effortLogReducer,
} from '../domain/effortLog.js';
import { analyzeRelationship } from '../domain/effortAnalysis.js';
import { useGhostingLifecycle } from '../hooks/useGhostingLifecycle.js';
import './SituationshipAnalyzer.css';

const PHASE_LABELS = Object.freeze({
  [RelationshipPhase.FRIENDS]: 'Friends',
  [RelationshipPhase.DATING_NO_LOVE]: 'Dating Without Love',
  [RelationshipPhase.OFFICIAL_LOVE]: 'Official Relationship',
  [RelationshipPhase.GHOSTED_EXIT]: 'Relationship Ended',
});

function formatScore(value) {
  return Number(value.toFixed(8)).toLocaleString('en-US');
}

export function SituationshipAnalyzer() {
  const {
    phase,
    pendingMessage,
    sendMessage,
    receiveReply,
    stop,
    changeRelationship,
  } = useGhostingLifecycle(RelationshipPhase.DATING_NO_LOVE);
  const [effortLog, appendEffort] = useReducer(effortLogReducer, []);
  const [emSteps, setEmSteps] = useState('100');
  const [otherSteps, setOtherSteps] = useState('1');
  const [inputError, setInputError] = useState('');
  const [now, setNow] = useState(() => performance.now());
  const nextSignalId = useRef(0);
  const signalPrefix = useId();
  const emId = useId();
  const otherId = useId();
  const phaseId = useId();
  const effortId = useId();
  const messageId = useId();

  const { emScore, rivalScore, redFlagWarning } = analyzeRelationship(phase, effortLog);
  const isDating = phase === RelationshipPhase.DATING_NO_LOVE;
  const canAddEffort = phase !== RelationshipPhase.GHOSTED_EXIT;
  const pending = Boolean(pendingMessage);

  useEffect(() => {
    if (!pendingMessage || !isDating) return undefined;
    const sync = () => setNow(performance.now());
    sync();
    const intervalId = window.setInterval(sync, 200);
    return () => window.clearInterval(intervalId);
  }, [pendingMessage?.id, pendingMessage?.sequence, isDating]);

  function submitEffort(actor, rawSteps) {
    if (!canAddEffort) return;
    const steps = Number(rawSteps);
    if (rawSteps.trim() === '' || !Number.isFinite(steps) || steps < 0) {
      setInputError('Effort steps must be a finite, non-negative number.');
      return;
    }

    nextSignalId.current += 1;
    appendEffort({
      type: EffortAction.APPEND_EFFORT,
      signal: {
        id: `${signalPrefix}-signal-${nextSignalId.current}`,
        actor,
        steps,
        multiplier: EFFORT_MULTIPLIER[actor],
      },
    });
    setInputError('');
  }

  function reply() {
    if (pendingMessage && isDating) {
      receiveReply(pendingMessage.id, pendingMessage.sequence);
    }
  }

  function transition(event) {
    changeRelationship(event);
    setInputError('');
  }

  const secondsRemaining = pending && isDating
    ? (Math.max(0, pendingMessage.deadline - now) / 1000).toFixed(1)
    : null;
  const messageStatus = phase === RelationshipPhase.GHOSTED_EXIT
    ? 'The relationship has ended.'
    : phase === RelationshipPhase.OFFICIAL_LOVE
      ? 'The relationship is now official.'
      : pending
        ? 'Message sent. Waiting for a reply.'
        : 'No message is waiting for a reply.';

  return (
    <article className="situationship" aria-labelledby={phaseId}>
      <header className="situationship__header">
        <p className="situationship__eyebrow">Situationship Analyzer</p>
        <h1 id={phaseId}>Dating Without Love</h1>
        <p>Current status: <strong>{PHASE_LABELS[phase]}</strong></p>
      </header>

      <section aria-labelledby={effortId} className="situationship__section">
        <h2 id={effortId}>Effort Scores</h2>
        <div className="situationship__efforts">
          <form onSubmit={event => {
            event.preventDefault();
            submitEffort(EffortActor.EM, emSteps);
          }}>
            <label htmlFor={emId}>Your effort — number of steps (× {EFFORT_MULTIPLIER.EM})</label>
            <input
              id={emId}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={emSteps}
              onChange={event => setEmSteps(event.target.value)}
              disabled={!canAddEffort}
            />
            <button type="submit" disabled={!canAddEffort}>Add Your Effort</button>
          </form>

          <form onSubmit={event => {
            event.preventDefault();
            submitEffort(EffortActor.AI_DO, otherSteps);
          }}>
            <label htmlFor={otherId}>The other person's effort — number of steps (× {EFFORT_MULTIPLIER.AI_DO})</label>
            <input
              id={otherId}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={otherSteps}
              onChange={event => setOtherSteps(event.target.value)}
              disabled={!canAddEffort}
            />
            <button type="submit" disabled={!canAddEffort}>Add Their Effort</button>
          </form>
        </div>

        {inputError && <p className="situationship__error" role="alert">{inputError}</p>}
        <dl className="situationship__scores">
          <div><dt>Your Score</dt><dd>{formatScore(emScore)}</dd></div>
          <div><dt>Their Score</dt><dd>{formatScore(rivalScore)}</dd></div>
        </dl>
        <output
          className={redFlagWarning ? 'situationship__warning' : 'situationship__safe'}
          role="status"
          aria-live="polite"
        >
          {redFlagWarning
            ? 'Red Flag: Effort is unequal while dating.'
            : 'No red flags detected.'}
        </output>
      </section>

      <section className="situationship__section" aria-labelledby={messageId}>
        <h2 id={messageId}>Messages and Relationship</h2>
        <p role="status" aria-live="polite">{messageStatus}</p>
        {pending && isDating && (
          <p
            className="situationship__countdown"
            aria-label={`${secondsRemaining} seconds left to reply`}
          >
            {secondsRemaining} seconds left to reply
          </p>
        )}
        <div className="situationship__actions">
          <button type="button" disabled={!isDating} onClick={sendMessage}>
            {pending ? 'Send Another Message' : 'Send Message'}
          </button>
          <button type="button" disabled={!isDating || !pending} onClick={reply}>Reply</button>
          <button type="button" disabled={!isDating} onClick={stop}>Stop</button>
          <button
            type="button"
            disabled={!isDating}
            onClick={() => transition(RelationshipEvent.CONFIRM_MUTUAL_COMMITMENT)}
          >
            Make It Official
          </button>
        </div>
      </section>
    </article>
  );
}

export default SituationshipAnalyzer;
