import { Stack } from '@chakra-ui/react';
import { PageHeader, type AbpHost, type SettingsPage } from '@abpjs/ui';
import { AgentsAdmin } from './AgentsAdmin';
import { useAgentTexts } from './texts';

/** The site's agents page, with its header: what a host's catch-all route draws for `agent.admin`. */
export function AgentsAdminPage() {
  const t = useAgentTexts();
  return (
    <Stack gap="section">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <AgentsAdmin />
    </Stack>
  );
}

/**
 * The area's settings pages for a host to file under its sections: `agent.admin`, the site's agents (the switch, every
 * agent, a new site agent, one agent's settings). The host gives where it opens and who sees it; the server checks every
 * call anyway. A host that links items passes its own page instead, with `<AgentsAdmin itemHref={…} />`.
 */
export function agentPages(options: {
  section: string;
  href: string;
  weight?: number;
  title?: string;
  about?: string;
  /** Who sees it; by default whoever the host says may `agent.site.admin` (pass the host to ask it). */
  visible?: SettingsPage['visible'];
  host?: Pick<AbpHost, 'can'>;
}): SettingsPage[] {
  return [
    {
      id: 'agent.admin',
      section: options.section,
      weight: options.weight ?? 100,
      title: options.title ?? 'AI agents',
      href: options.href,
      about: options.about,
      plugin: 'agent',
      visible: options.visible ?? (options.host?.can ? () => options.host!.can!('agent.site.admin') : undefined),
      component: AgentsAdminPage,
    },
  ];
}
