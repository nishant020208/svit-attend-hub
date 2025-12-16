import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: "class";
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem={false} 
      storageKey="app-theme"
      themes={["light", "dark", "vibrant"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}