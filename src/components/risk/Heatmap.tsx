import { cn } from "@/lib/utils";

export interface HeatmapCell {
  row: string;
  col: string;
  value: number; // 0..100 risk
}

interface Props {
  cells: HeatmapCell[];
  rows: string[];
  cols: string[];
  formatValue?: (v: number) => string;
  onCellClick?: (cell: { row: string; col: string; value: number }) => void;
}

function color(v: number) {
  if (v >= 75) return "bg-red-500/90 text-white";
  if (v >= 50) return "bg-orange-500/90 text-white";
  if (v >= 25) return "bg-yellow-400/90 text-foreground";
  return "bg-green-500/80 text-white";
}

export function Heatmap({ cells, rows, cols, formatValue, onCellClick }: Props) {
  const map = new Map(cells.map((c) => [`${c.row}|${c.col}`, c.value]));
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="text-left text-muted-foreground font-medium px-2 py-1"></th>
            {cols.map((c) => (
              <th key={c} className="text-center font-medium text-muted-foreground px-2 py-1 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="text-right pr-2 py-1 font-medium text-foreground whitespace-nowrap">{r}</td>
              {cols.map((c) => {
                const v = map.get(`${r}|${c}`);
                const clickable = v !== undefined && !!onCellClick;
                return (
                  <td key={c} className="p-0">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onCellClick!({ row: r, col: c, value: v! })}
                      className={cn(
                        "min-w-12 h-9 rounded-md flex items-center justify-center text-[11px] font-semibold transition-transform hover:scale-105 w-full",
                        v === undefined ? "bg-muted/40 text-muted-foreground cursor-default" : color(v),
                        clickable && "cursor-pointer hover:ring-2 hover:ring-primary/60"
                      )}
                      title={v === undefined ? "no data" : clickable ? `Drill down · ${r} · ${c}: ${v}` : `${r} · ${c}: ${v}`}
                    >
                      {v === undefined ? "–" : formatValue ? formatValue(v) : Math.round(v)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/80" /> Safe</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/90" /> Warning</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/90" /> High</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/90" /> Critical</span>
      </div>
    </div>
  );
}
