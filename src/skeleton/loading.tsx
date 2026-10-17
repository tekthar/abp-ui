import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { chakra, VisuallyHidden } from '@chakra-ui/react';
import { useTodaLabels } from '../provider/labels';

/** Whether the components below are waiting for their data (ADR 0061). */
const LoadingContext = createContext(false);

export interface LoadingProps {
  /** While true, every component inside draws its skeleton. */
  when: boolean;
  /** What screen readers hear while it loads; "Loading" by default. */
  label?: string;
  children?: ReactNode;
}

/**
 * Says once that a page, or a part of one, is waiting for its data (ADR 0061): every component inside draws its own
 * skeleton at its own size, and nothing inside takes focus or clicks. It adds no box of its own, so it can wrap
 * anything without changing the layout; screen readers hear "Loading" once, and the content fades in where its
 * placeholders were when the data comes.
 */
export function Loading({ when, label, children }: LoadingProps) {
  const labels = useTodaLabels();
  return (
    <LoadingContext.Provider value={when}>
      <chakra.div display="contents" aria-busy={when || undefined} inert={when || undefined} data-loading={when ? '' : undefined}>
        {when && <VisuallyHidden role="status">{label ?? labels.loading}</VisuallyHidden>}
        {children}
      </chakra.div>
    </LoadingContext.Provider>
  );
}

/** A component's loading: its own `loading` prop when given, else the nearest `Loading` scope's. */
export function useLoading(own?: boolean): boolean {
  const scope = useContext(LoadingContext);
  return own ?? scope;
}

/**
 * True for a moment after loading ends: what replaced a placeholder fades in there (150 ms, none with less motion),
 * instead of appearing at once.
 */
export function useArriving(loading: boolean): boolean {
  const [arriving, setArriving] = useState(false);
  const was = useRef(loading);
  useEffect(() => {
    if (was.current && !loading) {
      setArriving(true);
      const timer = window.setTimeout(() => setArriving(false), 400);
      was.current = loading;
      return () => window.clearTimeout(timer);
    }

    was.current = loading;
    return undefined;
  }, [loading]);
  return arriving;
}
