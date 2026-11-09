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
  [RelationshipPhase.FRIENDS]: 'Bạn bè',
  [RelationshipPhase.DATING_NO_LOVE]: 'Hẹn hò nhưng không yêu',
  [RelationshipPhase.OFFICIAL_LOVE]: 'Yêu chính thức',
  [RelationshipPhase.GHOSTED_EXIT]: 'Đã dừng lại',
});

function formatScore(value) {
  return Number(value.toFixed(8)).toLocaleString('vi-VN');
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
      setInputError('Số lần cố gắng phải là số hữu hạn không âm.');
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
    ? 'Đã kết thúc mối quan hệ.'
    : phase === RelationshipPhase.OFFICIAL_LOVE
      ? 'Hai người đã xác nhận mối quan hệ.'
      : pending
        ? 'Đã gửi tin nhắn, đang chờ phản hồi.'
        : 'Chưa có tin nhắn đang chờ.';

  return (
    <article className="situationship" aria-labelledby={phaseId}>
      <header className="situationship__header">
        <p className="situationship__eyebrow">Situationship Analyzer</p>
        <h1 id={phaseId}>Hẹn Hò Nhưng Không Yêu</h1>
        <p>Trạng thái hiện tại: <strong>{PHASE_LABELS[phase]}</strong></p>
      </header>

      <section aria-labelledby={effortId} className="situationship__section">
        <h2 id={effortId}>Mức độ cố gắng</h2>
        <div className="situationship__efforts">
          <form onSubmit={event => {
            event.preventDefault();
            submitEffort(EffortActor.EM, emSteps);
          }}>
            <label htmlFor={emId}>Em — số lần cố gắng (× {EFFORT_MULTIPLIER.EM})</label>
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
            <button type="submit" disabled={!canAddEffort}>Thêm nỗ lực của Em</button>
          </form>

          <form onSubmit={event => {
            event.preventDefault();
            submitEffort(EffortActor.AI_DO, otherSteps);
          }}>
            <label htmlFor={otherId}>Ai đó — số lần cố gắng (× {EFFORT_MULTIPLIER.AI_DO})</label>
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
            <button type="submit" disabled={!canAddEffort}>Thêm nỗ lực của Ai đó</button>
          </form>
        </div>

        {inputError && <p className="situationship__error" role="alert">{inputError}</p>}
        <dl className="situationship__scores">
          <div><dt>Điểm của Em</dt><dd>{formatScore(emScore)}</dd></div>
          <div><dt>Điểm của Ai đó</dt><dd>{formatScore(rivalScore)}</dd></div>
        </dl>
        <output
          className={redFlagWarning ? 'situationship__warning' : 'situationship__safe'}
          role="status"
          aria-live="polite"
        >
          {redFlagWarning
            ? 'Red Flag: Mức độ cố gắng không cân xứng khi đang hẹn hò.'
            : 'Không có cảnh báo Red Flag.'}
        </output>
      </section>

      <section className="situationship__section" aria-labelledby={messageId}>
        <h2 id={messageId}>Tin nhắn và mối quan hệ</h2>
        <p role="status" aria-live="polite">{messageStatus}</p>
        {pending && isDating && (
          <p
            className="situationship__countdown"
            aria-label={`Thời gian chờ phản hồi còn ${secondsRemaining} giây`}
          >
            Còn {secondsRemaining} giây để phản hồi
          </p>
        )}
        <div className="situationship__actions">
          <button type="button" disabled={!isDating} onClick={sendMessage}>
            {pending ? 'Gửi tin nhắn mới' : 'Send Message'}
          </button>
          <button type="button" disabled={!isDating || !pending} onClick={reply}>Reply</button>
          <button type="button" disabled={!isDating} onClick={stop}>Dừng Lại</button>
          <button
            type="button"
            disabled={!isDating}
            onClick={() => transition(RelationshipEvent.CONFIRM_MUTUAL_COMMITMENT)}
          >
            Xác nhận yêu chính thức
          </button>
        </div>
      </section>
    </article>
  );
}

export default SituationshipAnalyzer;
