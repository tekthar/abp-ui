/**
 * The colours a host brings (ADR 0109): six scales, light to dark. Components never use a raw step: the semantic tokens
 * (bg, fg, border, accent, success, statusCategory...) pick steps per colour mode, so any brand reads the same way.
 */
export interface AbpBrand {
  /** Greys: 0 (white) and 25 as the lightest surfaces, 850, 925 and 950 for dark mode's. */
  neutral: Record<0 | 25 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 850 | 900 | 925 | 950, string>;
  /** The one accent: links, the selected tint, primary buttons. */
  accent: Scale;
  green: Scale;
  amber: Scale;
  red: Scale;
  blue: Scale;
}

export type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

/** The package's own colours, for a host that brings none: plain greys and a blue accent. */
export const defaultBrand: AbpBrand = {
  neutral: {
    0: '#FFFFFF', 25: '#FCFCFD', 50: '#F8F9FA', 100: '#F1F3F5', 200: '#E6E8EB', 300: '#D2D6DB', 400: '#A9AFB7', 500: '#80878F',
    600: '#61676F', 700: '#484D54', 800: '#31353A', 850: '#282B30', 900: '#1F2226', 925: '#181A1D', 950: '#121416',
  },
  accent: {
    50: '#EEF4FF', 100: '#DCE7FE', 200: '#B9CFFD', 300: '#8DB0FB', 400: '#5E8BF6', 500: '#3B6CEB', 600: '#2853D4', 700: '#2243AB',
    800: '#213A88', 900: '#20336C', 950: '#152043',
  },
  green: {
    50: '#EDFAF2', 100: '#D3F3E0', 200: '#A9E6C3', 300: '#73D29E', 400: '#40B877', 500: '#22995B', 600: '#187C49', 700: '#16633C',
    800: '#154F32', 900: '#13412A', 950: '#0A2618',
  },
  amber: {
    50: '#FFF8EB', 100: '#FEEEC7', 200: '#FDDB8A', 300: '#FCC24D', 400: '#FBA924', 500: '#F5890B', 600: '#D96506', 700: '#B44609',
    800: '#92360E', 900: '#782E0F', 950: '#451603',
  },
  red: {
    50: '#FEF2F2', 100: '#FDE3E3', 200: '#FCCBCB', 300: '#F8A5A5', 400: '#F27171', 500: '#E84545', 600: '#D42828', 700: '#B21F1F',
    800: '#931D1D', 900: '#7A1E1E', 950: '#420B0B',
  },
  blue: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
    800: '#1E40AF', 900: '#1E3A8A', 950: '#172554',
  },
};
