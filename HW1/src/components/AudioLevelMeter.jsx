import { describeAudioLevel } from '../audio/audioLevelFormat.js';

/**
 * RMS digital full scale (dBFS), not a sound-pressure (dB SPL) measurement.
 * A real analyser samples the mixed output of the existing AudioEngine.
 */
export default function AudioLevelMeter({ dbfs }) {
  // Clamp only the visual bar; retain the true reading in the text.
  const displayValue = Number.isFinite(dbfs) ? Math.max(-60, Math.min(0, dbfs)) : -60;
  return (
    <section className="audio-level" aria-labelledby="audio-level-heading">
      <h2 id="audio-level-heading">Audio level</h2>
      <meter
        className="audio-level-meter"
        min="-60"
        max="0"
        value={displayValue}
        aria-label="Digital audio level"
        aria-valuetext={describeAudioLevel(dbfs)}
      />
      <p className="audio-level-reading" aria-live="off">{describeAudioLevel(dbfs)}</p>
      <p className="audio-level-explanation">Measured output level in dBFS (digital RMS), not calibrated acoustic dB SPL.</p>
    </section>
  );
}
