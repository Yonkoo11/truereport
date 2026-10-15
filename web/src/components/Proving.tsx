import { useEffect, useState } from 'react';

/** Shown while a proof is generated and the transaction submitted. */
export default function Proving() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="small" aria-live="polite">
      Proving and submitting. This takes 30 to 90 seconds; keep this tab open. <span className="num">{s}s</span>
    </p>
  );
}
