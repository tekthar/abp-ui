import { createContext, useContext, type ReactNode } from 'react';

/** The person's time zone (IANA, e.g. "Asia/Riyadh"); undefined shows times in the browser's. */
const TimeZoneContext = createContext<string | undefined>(undefined);

export function TimeZoneProvider({ value, children }: { value?: string; children: ReactNode }) {
  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

/** The time zone times are shown in: the person's preference from the nearest TodaProvider, else the browser's. */
export function useTodaTimeZone(): string | undefined {
  return useContext(TimeZoneContext);
}
