import { useState } from 'react';

export function useLoader() {
  const [loading, setLoading] = useState(false);
  const start = () => setLoading(true);
  const stop = () => setLoading(false);
  return { loading, start, stop };
}
