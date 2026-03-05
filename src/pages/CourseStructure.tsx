import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, Layers, LayoutGrid, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function CourseStructure() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subsections, setSubsections] = useState<any[]>([]);

  // Form states
  const [classForm, setClassForm] = useState({ name: "", code: "" });
  const [batchForm, setBatchForm] = useState({ name: "", class_id: "" });
  const [sectionForm, setSectionForm] = useState({ name: "", batch_id: "" });
  const [subsectionForm, setSubsectionForm] = useState({ name: "", section_id: "" });

  // Edit states
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!roleLoading && role !== "ADMIN") navigate("/dashboard");
  }, [role, roleLoading]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(p);
      await fetchAll();
    } catch { navigate("/auth"); } finally { setLoading(false); }
  };

  const fetchAll = async () => {
    const [c, b, s, ss] = await Promise.all([
      supabase.from("classes" as any).select("*").order("name"),
      supabase.from("batches" as any).select("*, classes:class_id(name)").order("name"),
      supabase.from("academic_sections" as any).select("*, batches:batch_id(name, classes:class_id(name))").order("name"),
      supabase.from("subsections" as any).select("*, academic_sections:section_id(name, batches:batch_id(name))").order("name"),
    ]);
    setClasses(c.data || []);
    setBatches(b.data || []);
    setSections(s.data || []);
    setSubsections(ss.data || []);
  };

  // CRUD helpers
  const handleCreate = async (table: string, data: any, formKey: string) => {
    try {
      const { error } = await supabase.from(table as any).insert(data);
      if (error) throw error;
      toast.success("Created successfully");
      setDialogOpen(prev => ({ ...prev, [formKey]: false }));
      await fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async (table: string, id: string, data: any, formKey: string) => {
    try {
      const { error } = await supabase.from(table as any).update(data).eq("id", id);
      if (error) throw error;
      toast.success("Updated successfully");
      setEditId(null);
      setDialogOpen(prev => ({ ...prev, [formKey]: false }));
      await fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm("Are you sure you want to delete this? All child items will also be deleted.")) return;
    try {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted successfully");
      await fetchAll();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Course Structure</h1>
          <p className="text-muted-foreground">Manage academic hierarchy: Class → Batch → Section → Subsection</p>
        </div>

        {/* Workflow Guide */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-foreground">Setup Workflow:</p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 rounded bg-primary/10 text-foreground font-medium">1. Create Class</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-primary/10 text-foreground font-medium">2. Create Batch</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-primary/10 text-foreground font-medium">3. Create Section</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-primary/10 text-foreground font-medium">4. Subsection (optional)</span>
              <span>→</span>
              <span className="px-2 py-1 rounded bg-primary/10 text-foreground font-medium">5. Assign Students</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="classes"><Building2 className="h-4 w-4 mr-1" />Classes</TabsTrigger>
            <TabsTrigger value="batches"><Layers className="h-4 w-4 mr-1" />Batches</TabsTrigger>
            <TabsTrigger value="sections"><LayoutGrid className="h-4 w-4 mr-1" />Sections</TabsTrigger>
            <TabsTrigger value="subsections"><Grid3X3 className="h-4 w-4 mr-1" />Subsections</TabsTrigger>
          </TabsList>

          {/* CLASSES TAB */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>Top-level academic groups</CardDescription>
                </div>
                <Dialog open={dialogOpen.class} onOpenChange={o => { setDialogOpen(p => ({...p, class: o})); if (!o) { setEditId(null); setClassForm({name:"",code:""}); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Class</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Class</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Name</Label><Input value={classForm.name} onChange={e => setClassForm(p => ({...p, name: e.target.value}))} placeholder="e.g. B.Tech" /></div>
                      <div><Label>Code</Label><Input value={classForm.code} onChange={e => setClassForm(p => ({...p, code: e.target.value}))} placeholder="e.g. BTECH" /></div>
                      <Button className="w-full" onClick={() => {
                        if (!classForm.name || !classForm.code) { toast.error("Fill all fields"); return; }
                        if (editId) handleUpdate("classes", editId, classForm, "class");
                        else handleCreate("classes", classForm, "class");
                      }}>{editId ? "Update" : "Create"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {classes.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                        <TableCell className="text-foreground">{c.code}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setClassForm({name:c.name,code:c.code}); setEditId(c.id); setDialogOpen(p=>({...p,class:true})); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete("classes", c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {classes.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No classes yet. Create one to get started.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BATCHES TAB */}
          <TabsContent value="batches">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Batches</CardTitle><CardDescription>Groups within a class</CardDescription></div>
                <Dialog open={dialogOpen.batch} onOpenChange={o => { setDialogOpen(p => ({...p, batch: o})); if (!o) { setEditId(null); setBatchForm({name:"",class_id:""}); } }}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Batch</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Batch</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Class</Label>
                        <Select value={batchForm.class_id} onValueChange={v => setBatchForm(p => ({...p, class_id: v}))}>
                          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                          <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Batch Name</Label><Input value={batchForm.name} onChange={e => setBatchForm(p => ({...p, name: e.target.value}))} placeholder="e.g. 2024-2028" /></div>
                      <Button className="w-full" onClick={() => {
                        if (!batchForm.name || !batchForm.class_id) { toast.error("Fill all fields"); return; }
                        if (editId) handleUpdate("batches", editId, batchForm, "batch");
                        else handleCreate("batches", batchForm, "batch");
                      }}>{editId ? "Update" : "Create"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Batch Name</TableHead><TableHead>Class</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {batches.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-foreground">{b.name}</TableCell>
                        <TableCell className="text-foreground">{b.classes?.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setBatchForm({name:b.name,class_id:b.class_id}); setEditId(b.id); setDialogOpen(p=>({...p,batch:true})); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete("batches", b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {batches.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No batches yet. Create a class first.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTIONS TAB */}
          <TabsContent value="sections">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Sections</CardTitle><CardDescription>Divisions within a batch</CardDescription></div>
                <Dialog open={dialogOpen.section} onOpenChange={o => { setDialogOpen(p => ({...p, section: o})); if (!o) { setEditId(null); setSectionForm({name:"",batch_id:""}); } }}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Section</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Section</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Batch</Label>
                        <Select value={sectionForm.batch_id} onValueChange={v => setSectionForm(p => ({...p, batch_id: v}))}>
                          <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.classes?.name} → {b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Section Name</Label><Input value={sectionForm.name} onChange={e => setSectionForm(p => ({...p, name: e.target.value}))} placeholder="e.g. A" /></div>
                      <Button className="w-full" onClick={() => {
                        if (!sectionForm.name || !sectionForm.batch_id) { toast.error("Fill all fields"); return; }
                        if (editId) handleUpdate("academic_sections", editId, sectionForm, "section");
                        else handleCreate("academic_sections", sectionForm, "section");
                      }}>{editId ? "Update" : "Create"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Batch</TableHead><TableHead>Class</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sections.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                        <TableCell className="text-foreground">{s.batches?.name}</TableCell>
                        <TableCell className="text-foreground">{s.batches?.classes?.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setSectionForm({name:s.name,batch_id:s.batch_id}); setEditId(s.id); setDialogOpen(p=>({...p,section:true})); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete("academic_sections", s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sections.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No sections yet. Create a batch first.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBSECTIONS TAB */}
          <TabsContent value="subsections">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Subsections</CardTitle><CardDescription>Optional subdivisions within sections</CardDescription></div>
                <Dialog open={dialogOpen.subsection} onOpenChange={o => { setDialogOpen(p => ({...p, subsection: o})); if (!o) { setEditId(null); setSubsectionForm({name:"",section_id:""}); } }}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Subsection</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Subsection</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Section</Label>
                        <Select value={subsectionForm.section_id} onValueChange={v => setSubsectionForm(p => ({...p, section_id: v}))}>
                          <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                          <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.batches?.classes?.name} → {s.batches?.name} → {s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Subsection Name</Label><Input value={subsectionForm.name} onChange={e => setSubsectionForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Sub-A1" /></div>
                      <Button className="w-full" onClick={() => {
                        if (!subsectionForm.name || !subsectionForm.section_id) { toast.error("Fill all fields"); return; }
                        if (editId) handleUpdate("subsections", editId, subsectionForm, "subsection");
                        else handleCreate("subsections", subsectionForm, "subsection");
                      }}>{editId ? "Update" : "Create"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Subsection</TableHead><TableHead>Section</TableHead><TableHead>Batch</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subsections.map(ss => (
                      <TableRow key={ss.id}>
                        <TableCell className="font-medium text-foreground">{ss.name}</TableCell>
                        <TableCell className="text-foreground">{ss.academic_sections?.name}</TableCell>
                        <TableCell className="text-foreground">{ss.academic_sections?.batches?.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setSubsectionForm({name:ss.name,section_id:ss.section_id}); setEditId(ss.id); setDialogOpen(p=>({...p,subsection:true})); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete("subsections", ss.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {subsections.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No subsections yet. This is optional.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
