import { createContext, useContext } from 'react';

/** How much the interface moves for a person (ADR 0058): as their system says, less, or full. */
export type MotionSetting = 'system' | 'reduced' | 'full';

export interface MotionState {
  /** The person's choice. */
  setting: MotionSetting;
  /** Whether movement is off now: their choice, or their system's when they left it to the system. */
  reduce: boolean;
  /** Changes it on this page at once (the host saves it). */
  setSetting: (setting: MotionSetting) => void;
}

export const MotionContext = createContext<MotionState>({ setting: 'system', reduce: false, setSetting: () => {} });

/** The person's motion setting, and whether movement is off: every moving component asks this. */
export function useMotionSetting(): MotionState {
  return useContext(MotionContext);
}

export const asMotionSetting = (value: unknown): MotionSetting => (value === 'reduced' || value === 'full' ? value : 'system');
