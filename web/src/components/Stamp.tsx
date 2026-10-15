type Tone = 'ok' | 'danger' | 'unknown';
type Size = 'lg' | 'md' | 'sm';

/** The registry stamp: pressed once on mount, never replayed. */
export default function Stamp({ word, tone, size }: { word: string; tone: Tone; size: Size }) {
  return <span className={`stamp stamp--${size} stamp--${tone}`}>{word}</span>;
}
