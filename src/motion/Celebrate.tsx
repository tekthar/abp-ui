import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { chakra, Portal } from '@chakra-ui/react';
import { burst, type Particle } from './presets';
import { useMotionSetting } from './setting';
import { curves, durations } from './tokens';

/** Where a burst starts: an element (its centre) or a point on the screen. */
export type CelebrateTarget = Element | { x: number; y: number };

type Celebrate = (target: CelebrateTarget) => void;

const CelebrateContext = createContext<Celebrate>(() => {});

/**
 * A small burst from where something good happened (ADR 0058): a record reaching done, a sprint closed, an approval
 * given, an import finished. Only for real moments, never for a bulk change, and never with reduced motion.
 */
export function useCelebrate(): Celebrate {
  return useContext(CelebrateContext);
}

interface Burst {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}

const MotionSpan = chakra(m.span, {}, { forwardProps: ['transition'] });

const TONES = ['accent.solid', 'success.solid', 'warning.solid', 'info.solid'] as const;
const PARTICLES = 14;

/** Holds the bursts above everything else; MotionProvider renders it. */
export function CelebrationLayer({ children }: { children: ReactNode }) {
  const { reduce } = useMotionSetting();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const next = useRef(1);

  const celebrate = useCallback<Celebrate>(
    (target) => {
      if (reduce || typeof window === 'undefined') return;
      const at = target instanceof Element ? target.getBoundingClientRect() : null;
      const x = at ? at.left + at.width / 2 : (target as { x: number }).x;
      const y = at ? at.top + at.height / 2 : (target as { y: number }).y;
      const id = next.current++;
      setBursts((all) => [...all.slice(-3), { id, x, y, particles: burst(PARTICLES, id * 7919) }]);
      window.setTimeout(() => setBursts((all) => all.filter((b) => b.id !== id)), durations.burst * 1000 + 100);
    },
    [reduce],
  );

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {bursts.length > 0 && (
        <Portal>
          <chakra.div position="fixed" inset="0" pointerEvents="none" zIndex="toast" aria-hidden="true">
            <AnimatePresence>
              {bursts.map((b) =>
                b.particles.map((p, i) => (
                  <MotionSpan
                    key={`${b.id}-${i}`}
                    position="absolute"
                    width={`${p.size}px`}
                    height={`${p.size}px`}
                    rounded={p.round ? 'full' : '1px'}
                    bg={TONES[p.tone]}
                    style={{ left: b.x - p.size / 2, top: b.y - p.size / 2 }}
                    initial={{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) rotate(0deg) scale(0.6)' }}
                    animate={{
                      opacity: [1, 1, 0],
                      transform: [
                        'translate3d(0px, 0px, 0px) rotate(0deg) scale(0.6)',
                        `translate3d(${p.x}px, ${p.y - 16}px, 0px) rotate(${p.rotate / 2}deg) scale(1)`,
                        `translate3d(${p.x * 1.1}px, ${p.y + 10}px, 0px) rotate(${p.rotate}deg) scale(0.9)`,
                      ],
                    }}
                    transition={{ duration: durations.burst, ease: curves.out, times: [0, 0.6, 1] }}
                  />
                )),
              )}
            </AnimatePresence>
          </chakra.div>
        </Portal>
      )}
    </CelebrateContext.Provider>
  );
}
