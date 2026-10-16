import type { ReactNode } from 'react';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { CelebrationLayer } from './Celebrate';
import { springs } from './tokens';

/**
 * Motion for everything under it (ADR 0058): reduced motion follows the person's system setting (movement off, fades
 * kept), springs are soft unless a component asks otherwise, and only the light `m` components are allowed (strict),
 * so nothing pulls in the full `motion` component by accident. TodaProvider renders it; plugins render inside it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={springs.soft}>
        <CelebrationLayer>{children}</CelebrationLayer>
      </MotionConfig>
    </LazyMotion>
  );
}
