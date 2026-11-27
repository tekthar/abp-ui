import { createAreaTexts } from '@abpjs/ui';
import ar from './texts/ar.json';
import en from './texts/en.json';

/** The area's words, in English and Arabic; a host overrides any key through `AbpHost.texts.storage`. */
export const useStorageTexts = createAreaTexts('storage', { en, ar });
