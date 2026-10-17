import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { CelebrationLayer } from './Celebrate';
import { MotionContext, type MotionSetting } from './setting';
import { springs } from './tokens';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Whether the person's system asks for less motion; false while the server renders. */
function useSystemReduces(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false),
    () => false,
  );
}

/**
 * Motion for everything under it (ADR 0058). The person's setting decides: as their system says (Motion's own
 * reduced-motion handling: movement off, fades kept), less (always reduced), or full (even when the system asks for
 * less). The page's root element carries it (`data-motion`), so CSS motion follows the same choice. Springs are soft
 * unless a component asks otherwise, and only the light `m` components are allowed (strict), with Motion's
 * `domAnimation` features: layout motion is the FLIP helper's (flip.ts), a third lighter. TodaProvider renders it;
 * plugins render inside it.
 */
export function MotionProvider({ setting: initial = 'system', children }: { setting?: MotionSetting; children: ReactNode }) {
  const [setting, setState] = useState<MotionSetting>(initial);
  const systemReduces = useSystemReduces();
  const reduce = setting === 'reduced' || (setting === 'system' && systemReduces);

  useEffect(() => {
    document.documentElement.dataset.motion = setting;
  }, [setting]);

  const setSetting = useCallback((next: MotionSetting) => setState(next), []);
  const value = useMemo(() => ({ setting, reduce, setSetting }), [setting, reduce, setSetting]);

  return (
    <MotionContext.Provider value={value}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion={setting === 'reduced' ? 'always' : setting === 'full' ? 'never' : 'user'} transition={springs.soft}>
          <CelebrationLayer>{children}</CelebrationLayer>
        </MotionConfig>
      </LazyMotion>
    </MotionContext.Provider>
  );
}
