import { useEffect, useState } from 'react';

/** A value that follows another once it has stood still for `ms` (what's typed in a search box, before it asks). */
export function useSettledValue<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
