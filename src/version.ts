declare const __TODA_UI_VERSION__: string;

/** Version of @todahq/ui, used as the Module Federation shared version. */
export const TODA_UI_VERSION: string = typeof __TODA_UI_VERSION__ === 'string' ? __TODA_UI_VERSION__ : '0.0.0-dev';
