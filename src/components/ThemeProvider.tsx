import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

export function ThemeProvider({ children, ...props }: { children: ReactNode; attribute?: "class"; defaultTheme?: string; enableSystem?: boolean; storageKey?: string }) {
  return <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="app-theme" {...props}>{children}</NextThemesProvider>;
}
