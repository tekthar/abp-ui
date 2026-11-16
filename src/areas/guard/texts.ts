import { Fragment, createElement, useCallback, type ReactNode } from 'react';
import { createAreaTexts } from '@abpjs/ui';
import ar from './texts/ar.json';
import en from './texts/en.json';

/** The area's words, in English and Arabic; a host overrides any key through `AbpHost.texts.guard`. */
export const useGuardTexts = createAreaTexts('guard', { en, ar });

export type GuardText = (key: string, values?: Record<string, string | number>) => string;

/** One group of the area's words (`directories`, `accountDetail`): `t('title')` reads `directories.title`. */
export function useGuardNs(namespace: string): GuardText {
  const t = useGuardTexts();
  return useCallback((key: string, values?: Record<string, string | number>) => t(`${namespace}.${key}`, values), [t, namespace]);
}

/**
 * A text with places for parts it doesn't hold (`Merged into <survivor></survivor>`): each empty tag gives way to the
 * part of that name, a link say, so the sentence stays in one piece for each language's word order.
 */
export function withParts(text: string, parts: Record<string, ReactNode>): ReactNode {
  const pieces = text.split(/<(\w+)><\/\1>/);
  return createElement(Fragment, null, ...pieces.map((piece, i) => (i % 2 === 0 ? piece : createElement(Fragment, { key: i }, parts[piece] ?? null))));
}
