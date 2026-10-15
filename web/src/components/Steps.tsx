const Tick = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true">
    <path d="M2 5.2 4.2 7.4 8 3" fill="none" stroke="var(--ground)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Named steps instead of a spinner. `done` is how many are finished. */
export default function Steps({ labels, done }: { labels: readonly string[]; done: number }) {
  return (
    <ol className="steps">
      {labels.map((l, i) => (
        <li key={l}>
          <span className={i < done ? 'dot dot--done' : 'dot'}>{i < done && <Tick />}</span>
          <span>{l}</span>
          <span className="sr-only">{i < done ? ' (done)' : ''}</span>
        </li>
      ))}
    </ol>
  );
}
