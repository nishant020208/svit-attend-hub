import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { announcementSchema, validateFile, type AnnouncementFormData } from "@/lib/validationSchemas";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, User, Paperclip, Download } from "lucide-react";
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

  // File validation constants
  const ALLOWED_FILE_TYPES = ['application/pdf', 'text/csv', 'image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchAnnouncements();
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          profiles:posted_by (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const fileName = filePath.split('/').pop();
      if (!fileName) return null;
      
      const { data, error } = await supabase.storage
        .from('announcements')
        .createSignedUrl(fileName, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const handleDownloadAttachment = async (attachmentUrl: string) => {
    const signedUrl = await getSignedUrl(attachmentUrl);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Failed to download attachment",
        variant: "destructive",
      });
    }
  };

  const handleCreateAnnouncement = async () => {
    setValidationErrors({});

    // Validate form data with zod
    try {
      announcementSchema.parse({ title, content });
    } catch (error: any) {
      if (error.errors) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive",
        });
      }
      return;
    }

    // Validate file if provided
    if (uploadedFile) {
      const fileValidation = validateFile(uploadedFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE);
      if (!fileValidation.valid) {
        toast({
          title: "Invalid File",
          description: fileValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setUploading(true);
      let attachmentUrl = null;

      // Upload file if provided
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;
        
        // Store just the file path, not the public URL
        attachmentUrl = fileName;
      }

      const { error } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          content: content.trim(),
          posted_by: userId,
          attachment_url: attachmentUrl,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement posted successfully",
      });

      setTitle("");
      setContent("");
      setUploadedFile(null);
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingGeometry variant="default" />
      <TopTabs userEmail={user?.email} userName={user?.user_metadata?.name} userRole={role || undefined} />
      <main className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Stay updated with latest notices</p>
          </div>
          {role === "ADMIN" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>Post a new announcement for all users</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Announcement title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    {validationErrors.title && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.title}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Announcement content..."
                      rows={5}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                    {validationErrors.content && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.content}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="file">Attachment (PDF/CSV/Image)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.csv,.jpg,.jpeg,.png"
                        onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      />
                      {uploadedFile && (
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      )}
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
                <CardTitle>{announcement.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{announcement.profiles?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
                {announcement.attachment_url && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadAttachment(announcement.attachment_url)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Attachment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {announcements.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center">No announcements yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}