import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { announcementSchema, validateFile, type AnnouncementFormData } from "@/lib/validationSchemas";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, User, Paperclip, Download, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";

export default function Announcements() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Target filter states for creating announcement
  const [targetType, setTargetType] = useState("all");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetBatchId, setTargetBatchId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [targetSubsectionId, setTargetSubsectionId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");

  // Structure data
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subsections, setSubsections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const ALLOWED_FILE_TYPES = ['application/pdf', 'text/csv', 'image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      await Promise.all([fetchAnnouncements(), fetchStructure()]);
    } catch { navigate("/auth"); } finally { setLoading(false); }
  };

  const fetchStructure = async () => {
    const [c, b, s, ss, st] = await Promise.all([
      supabase.from("classes" as any).select("*").order("name"),
      supabase.from("batches" as any).select("*").order("name"),
      supabase.from("academic_sections" as any).select("*").order("name"),
      supabase.from("subsections" as any).select("*").order("name"),
      supabase.from("students").select("*, profiles:user_id(name)"),
    ]);
    setClasses(c.data || []);
    setBatches(b.data || []);
    setSections(s.data || []);
    setSubsections(ss.data || []);
    setStudents(st.data || []);
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(`*, profiles:posted_by (name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) { console.error("Error fetching announcements:", error); }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const fileName = filePath.split('/').pop();
      if (!fileName) return null;
      const { data, error } = await supabase.storage.from('announcements').createSignedUrl(fileName, 3600);
      if (error) return null;
      return data.signedUrl;
    } catch { return null; }
  };

  const handleDownloadAttachment = async (attachmentUrl: string) => {
    const signedUrl = await getSignedUrl(attachmentUrl);
    if (signedUrl) window.open(signedUrl, '_blank');
    else toast({ title: "Error", description: "Failed to download attachment", variant: "destructive" });
  };

  const getTargetLabel = (ann: any) => {
    if (!ann.target_type || ann.target_type === "all") return null;
    return ann.target_type.charAt(0).toUpperCase() + ann.target_type.slice(1);
  };

  const handleCreateAnnouncement = async () => {
    setValidationErrors({});
    try { announcementSchema.parse({ title, content }); } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => { if (err.path[0]) errors[err.path[0]] = err.message; });
        setValidationErrors(errors);
        toast({ title: "Validation Error", description: "Please check the form", variant: "destructive" });
      }
      return;
    }

    if (uploadedFile) {
      const fileValidation = validateFile(uploadedFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE);
      if (!fileValidation.valid) { toast({ title: "Invalid File", description: fileValidation.error, variant: "destructive" }); return; }
    }

    try {
      setUploading(true);
      let attachmentUrl = null;
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('announcements').upload(fileName, uploadedFile);
        if (uploadError) throw uploadError;
        attachmentUrl = fileName;
      }

      const insertData: any = {
        title: title.trim(),
        content: content.trim(),
        posted_by: userId,
        attachment_url: attachmentUrl,
        target_type: targetType,
      };
      if (targetType === "class" && targetClassId) insertData.target_class_id = targetClassId;
      if (targetType === "batch" && targetBatchId) insertData.target_batch_id = targetBatchId;
      if (targetType === "section" && targetSectionId) insertData.target_section_id = targetSectionId;
      if (targetType === "subsection" && targetSubsectionId) insertData.target_subsection_id = targetSubsectionId;
      if (targetType === "student" && targetStudentId) insertData.target_student_id = targetStudentId;

      const { error } = await supabase.from("announcements").insert(insertData);
      if (error) throw error;

      toast({ title: "Success", description: "Announcement posted successfully" });
      setTitle(""); setContent(""); setUploadedFile(null); setDialogOpen(false);
      setTargetType("all"); setTargetClassId(""); setTargetBatchId(""); setTargetSectionId(""); setTargetSubsectionId(""); setTargetStudentId("");
      fetchAnnouncements();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">Stay updated with latest notices</p>
          </div>
          {role === "ADMIN" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Announcement</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>Post a targeted or global announcement</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label htmlFor="title">Title</Label>
                    <Input id="title" placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    {validationErrors.title && <p className="text-sm text-destructive mt-1">{validationErrors.title}</p>}
                  </div>
                  <div><Label htmlFor="content">Content</Label>
                    <Textarea id="content" placeholder="Announcement content..." rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
                    {validationErrors.content && <p className="text-sm text-destructive mt-1">{validationErrors.content}</p>}
                  </div>

                  {/* Target Selection */}
                  <div><Label>Send To</Label>
                    <Select value={targetType} onValueChange={v => { setTargetType(v); setTargetClassId(""); setTargetBatchId(""); setTargetSectionId(""); setTargetSubsectionId(""); setTargetStudentId(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                        <SelectItem value="batch">Specific Batch</SelectItem>
                        <SelectItem value="section">Specific Section</SelectItem>
                        <SelectItem value="subsection">Specific Subsection</SelectItem>
                        <SelectItem value="student">Individual Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {targetType === "class" && (
                    <div><Label>Class</Label>
                      <Select value={targetClassId} onValueChange={setTargetClassId}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {targetType === "batch" && (
                    <div><Label>Batch</Label>
                      <Select value={targetBatchId} onValueChange={setTargetBatchId}>
                        <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                        <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {targetType === "section" && (
                    <div><Label>Section</Label>
                      <Select value={targetSectionId} onValueChange={setTargetSectionId}>
                        <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {targetType === "subsection" && (
                    <div><Label>Subsection</Label>
                      <Select value={targetSubsectionId} onValueChange={setTargetSubsectionId}>
                        <SelectTrigger><SelectValue placeholder="Select subsection" /></SelectTrigger>
                        <SelectContent>{subsections.map(ss => <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {targetType === "student" && (
                    <div><Label>Student</Label>
                      <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                        <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                        <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.profiles?.name} ({s.roll_number})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}

                  <div><Label htmlFor="file">Attachment (PDF/CSV/Image)</Label>
                    <div className="flex items-center gap-2">
                      <Input id="file" type="file" accept=".pdf,.csv,.jpg,.jpeg,.png" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
                      {uploadedFile && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <Button onClick={handleCreateAnnouncement} className="w-full" disabled={uploading}>
                    {uploading ? "Uploading..." : "Post Announcement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">{announcement.title}</CardTitle>
                  {getTargetLabel(announcement) && (
                    <Badge variant="outline"><Filter className="h-3 w-3 mr-1" />{getTargetLabel(announcement)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><User className="h-4 w-4" /><span>{announcement.profiles?.name}</span></div>
                  <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>{new Date(announcement.created_at).toLocaleDateString()}</span></div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                {announcement.attachment_url && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadAttachment(announcement.attachment_url)}>
                      <Download className="mr-2 h-4 w-4" />Download Attachment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {announcements.length === 0 && (
            <Card><CardContent className="py-12"><p className="text-muted-foreground text-center">No announcements yet</p></CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
