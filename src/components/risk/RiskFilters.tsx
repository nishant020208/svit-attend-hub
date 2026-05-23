import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export interface RiskFilterState {
  search: string;
  level: string;
  course: string;
  year: string;
}

interface Props {
  value: RiskFilterState;
  onChange: (v: RiskFilterState) => void;
  courses?: string[];
}

export function RiskFilters({ value, onChange, courses = [] }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
      <div className="relative sm:col-span-2">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, roll, email…"
          className="pl-9"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>
      <Select value={value.level} onValueChange={(v) => onChange({ ...value, level: v })}>
        <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All severities</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.year} onValueChange={(v) => onChange({ ...value, year: v })}>
        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All years</SelectItem>
          {[1, 2, 3, 4].map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
        </SelectContent>
      </Select>
      {courses.length > 0 && (
        <Select value={value.course} onValueChange={(v) => onChange({ ...value, course: v })}>
          <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All courses</SelectItem>
            {courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
