import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative hover-glow transition-smooth"
        >
          <Sun className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${theme !== 'light' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
          <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${theme !== 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
          <Sparkles className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${theme !== 'vibrant' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-effect">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("vibrant")} className="cursor-pointer">
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Vibrant</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}