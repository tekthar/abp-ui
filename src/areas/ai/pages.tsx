import { Stack } from '@chakra-ui/react';
import { PageHeader, type SettingsPage } from '@abpjs/ui';
import { AiAdmin } from './AiAdmin';
import { useAiTexts } from './texts';

/** The site's AI page, with its header: what a host's catch-all route draws for `ai.admin`. */
export function AiAdminPage() {
  const t = useAiTexts();
  return (
    <Stack gap="section">
      <PageHeader title={t('pageTitle')} description={t('pageSubtitle')} />
      <AiAdmin />
    </Stack>
  );
}

/**
 * The area's settings pages for a host to file under its sections: `ai.admin`, the site's AI (models, aliases, access,
 * limits, usage, exports). The host gives where it opens and who sees it; the server checks every call anyway.
 */
export function aiPages(options: {
  section: string;
  href: string;
  weight?: number;
  title?: string;
  about?: string;
  visible?: SettingsPage['visible'];
}): SettingsPage[] {
  return [
    {
      id: 'ai.admin',
      section: options.section,
      weight: options.weight ?? 100,
      title: options.title ?? 'AI models and usage',
      href: options.href,
      about: options.about,
      plugin: 'ai',
      visible: options.visible,
      component: AiAdminPage,
    },
  ];
}
