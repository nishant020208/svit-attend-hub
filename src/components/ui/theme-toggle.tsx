import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const currentTheme = theme || resolvedTheme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative hover-glow transition-smooth border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20"
        >
          {currentTheme === "light" && <Sun className="h-[1.2rem] w-[1.2rem] text-primary-foreground" />}
          {currentTheme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem] text-primary-foreground" />}
          {currentTheme === "vibrant" && <Sparkles className="h-[1.2rem] w-[1.2rem] text-primary-foreground animate-pulse" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-card border border-border shadow-lg">
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className={`cursor-pointer ${currentTheme === "light" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className={`cursor-pointer ${currentTheme === "dark" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("vibrant")} 
          className={`cursor-pointer ${currentTheme === "vibrant" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Vibrant</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}