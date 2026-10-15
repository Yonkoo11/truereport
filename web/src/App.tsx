import { useEffect, useState } from 'react';
import { check } from './lib/verify';
import { CONTRACT_ADDRESS } from './lib/config';

export default function App() {
  const [out, setOut] = useState('checking');
  useEffect(() => {
    check(location.hash.slice(1), CONTRACT_ADDRESS).then((r) => setOut(r.verdict), (e) => setOut('error: ' + String(e?.message ?? e)));
  }, []);
  return <p id="verdict">{out}</p>;
}
