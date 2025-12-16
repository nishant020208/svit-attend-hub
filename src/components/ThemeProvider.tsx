import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { ReactNode, useEffect } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: "class";
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
}

function ThemeClassEnforcer() {
  const { theme } = useTheme();

  useEffect(() => {
    // Ensure ONLY one theme class is present at a time
    const root = document.documentElement;
    root.classList.remove("dark", "vibrant");

    if (theme === "dark") root.classList.add("dark");
    if (theme === "vibrant") root.classList.add("vibrant");
    // light => no class
  }, [theme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="app-theme"
      themes={["light", "dark", "vibrant"]}
      value={{ light: "light", dark: "dark", vibrant: "vibrant" }}
      {...props}
    >
      <ThemeClassEnforcer />
      {children}
    </NextThemesProvider>
  );
}