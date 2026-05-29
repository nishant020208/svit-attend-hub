import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bookmark, BookmarkPlus, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface RiskPreset {
  name: string;
  dateFrom: string;
  dateTo: string;
  course: string;
  year: string;
  level: string;
}

const KEY = "risk-analytics-presets-v1";

function load(): RiskPreset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(p: RiskPreset[]) { localStorage.setItem(KEY, JSON.stringify(p)); }

interface Props {
  current: Omit<RiskPreset, "name">;
  onApply: (p: RiskPreset) => void;
}

export function FilterPresets({ current, onApply }: Props) {
  const { toast } = useToast();
  const [presets, setPresets] = useState<RiskPreset[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { setPresets(load()); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    const next = [...presets.filter((p) => p.name !== name.trim()), { ...current, name: name.trim() }];
    setPresets(next); save(next);
    toast({ title: "Preset saved", description: name });
    setName(""); setShowSave(false);
  };

  const handleDelete = (n: string) => {
    const next = presets.filter((p) => p.name !== n);
    setPresets(next); save(next);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" /> Presets
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{presets.length}</Badge>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-background">
          <DropdownMenuLabel>Saved Filter Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">No presets yet. Save the current filters to reuse them later.</p>
          ) : presets.map((p) => (
            <DropdownMenuItem key={p.name} onSelect={(e) => e.preventDefault()} className="flex items-center justify-between gap-2 cursor-pointer">
              <button onClick={() => onApply(p)} className="flex-1 text-left">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {[p.course !== "ALL" && p.course, p.year !== "ALL" && `Y${p.year}`, p.level !== "ALL" && p.level].filter(Boolean).join(" · ") || "All"}
                </div>
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.name)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {showSave ? (
        <div className="flex items-center gap-1">
          <Input autoFocus placeholder="Preset name…" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()} className="h-9 w-40" />
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowSave(false); setName(""); }}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSave(true)}>
          <BookmarkPlus className="h-4 w-4" /> Save current
        </Button>
      )}
    </div>
  );
}
