declare const __ABP_UI_VERSION__: string;

/** The design system's version, used as the Module Federation shared version. */
export const ABP_UI_VERSION: string = typeof __ABP_UI_VERSION__ === 'string' ? __ABP_UI_VERSION__ : '0.0.0-dev';
