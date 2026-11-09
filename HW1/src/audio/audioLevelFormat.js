/** User-facing RMS digital level, NOT an acoustic dB SPL reading. */
export function describeAudioLevel(dbfs) {
  if (typeof dbfs !== 'number') return 'Audio level unavailable';
  if (dbfs === -Infinity) return 'Silence (−∞ dBFS)';
  if (!Number.isFinite(dbfs)) return 'Audio level unavailable';
  return `${dbfs.toFixed(1)} dBFS RMS`;
}
