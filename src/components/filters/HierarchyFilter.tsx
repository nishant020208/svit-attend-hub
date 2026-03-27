import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface HierarchyFilterProps {
  onFilterChange: (filters: {
    classId: string;
    batchId: string;
    sectionId: string;
    subsectionId: string;
  }) => void;
  showSubsection?: boolean;
}

export function HierarchyFilter({ onFilterChange, showSubsection = true }: HierarchyFilterProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subsections, setSubsections] = useState<any[]>([]);

  const [classId, setClassId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subsectionId, setSubsectionId] = useState("");

  useEffect(() => {
    supabase.from("classes").select("*").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    if (classId) {
      supabase.from("batches").select("*").eq("class_id", classId).order("name").then(({ data }) => setBatches(data || []));
    } else {
      setBatches([]);
    }
    setBatchId("");
    setSectionId("");
    setSubsectionId("");
  }, [classId]);

  useEffect(() => {
    if (batchId) {
      supabase.from("academic_sections").select("*").eq("batch_id", batchId).order("name").then(({ data }) => setSections(data || []));
    } else {
      setSections([]);
    }
    setSectionId("");
    setSubsectionId("");
  }, [batchId]);

  useEffect(() => {
    if (sectionId && showSubsection) {
      supabase.from("subsections").select("*").eq("section_id", sectionId).order("name").then(({ data }) => setSubsections(data || []));
    } else {
      setSubsections([]);
    }
    setSubsectionId("");
  }, [sectionId, showSubsection]);

  useEffect(() => {
    onFilterChange({ classId, batchId, sectionId, subsectionId });
  }, [classId, batchId, sectionId, subsectionId]);

  const clearFilters = () => {
    setClassId("");
    setBatchId("");
    setSectionId("");
    setSubsectionId("");
  };

  const hasFilters = classId || batchId || sectionId || subsectionId;

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30 mb-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters</span>
      </div>

      <div className="flex-1 flex flex-wrap gap-3">
        <div className="min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Batch</Label>
          <Select value={batchId} onValueChange={setBatchId} disabled={!classId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
              {batches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Section</Label>
          <Select value={sectionId} onValueChange={setSectionId} disabled={!batchId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              {sections.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showSubsection && (
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Subsection</Label>
            <Select value={subsectionId} onValueChange={setSubsectionId} disabled={!sectionId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {subsections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
          <X className="h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  );
}
