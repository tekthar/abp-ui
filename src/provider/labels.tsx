import { createContext, useContext, type ReactNode } from 'react';

/**
 * Every string the components render on their own. The package ships English defaults and
 * knows nothing about i18n libraries: the host passes translated labels to TodaProvider.
 */
export interface TodaLabels {
  close: string;
  cancel: string;
  confirm: string;
  retry: string;
  loading: string;
  noData: string;
  navigation: string;
  breadcrumb: string;
  skipToContent: string;
  openNavigation: string;
  collapseSidebar: string;
  expandSidebar: string;
  toggleColorMode: string;
  colorModeLight: string;
  colorModeDark: string;
  sortAscending: string;
  sortDescending: string;
  path: string;
}

export const defaultLabels: TodaLabels = {
  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  retry: 'Retry',
  loading: 'Loading',
  noData: 'Nothing to show yet.',
  navigation: 'Main navigation',
  breadcrumb: 'Breadcrumb',
  skipToContent: 'Skip to content',
  openNavigation: 'Open navigation',
  collapseSidebar: 'Collapse sidebar',
  expandSidebar: 'Expand sidebar',
  toggleColorMode: 'Toggle colour mode',
  colorModeLight: 'Light',
  colorModeDark: 'Dark',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  path: 'Path',
};

const LabelsContext = createContext<TodaLabels>(defaultLabels);

export function LabelsProvider({ value, children }: { value?: Partial<TodaLabels>; children: ReactNode }) {
  return <LabelsContext.Provider value={{ ...defaultLabels, ...value }}>{children}</LabelsContext.Provider>;
}

export function useTodaLabels(): TodaLabels {
  return useContext(LabelsContext);
}
