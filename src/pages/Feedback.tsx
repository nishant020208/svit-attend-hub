import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Loader2, AlertTriangle, CheckCircle, Clock, Brain, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CATEGORIES = [
  { value: "academic", label: "Academic" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "faculty", label: "Faculty" },
  { value: "library", label: "Library" },
  { value: "hostel", label: "Hostel" },
  { value: "canteen", label: "Canteen" },
  { value: "general", label: "General" },
];

export default function Feedback() {
  const { toast } = useToast();
  const { role, userId, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data } = await supabase.from("profiles").select("name, email").eq("id", userId).single();
      if (data) { setUserName(data.name); setUserEmail(data.email); }
    };
    fetchProfile();
  }, [userId]);

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ["feedback", role],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback")
        .select("*, profiles:user_id(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("feedback")
        .insert({ user_id: userId, category, subject, message });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Feedback Submitted", description: "Thank you for your feedback!" });
      setSubject(""); setMessage(""); setCategory("general");
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const { error } = await (supabase as any)
        .from("feedback")
        .update({ admin_response: response, status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Response Sent" });
      setRespondingTo(null); setResponseText("");
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Feedback Deleted" });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const analyzeWithAI = async () => {
    if (!feedbackList || feedbackList.length === 0) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback", {
        body: { feedback: feedbackList.filter((f: any) => f.status === "pending").map((f: any) => ({
          category: f.category, subject: f.subject, message: f.message,
        }))},
      });
      if (error) throw error;
      setAiSummary(data.analysis);
    } catch (e: any) {
      toast({ title: "Analysis Error", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "in_progress": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default: return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={userEmail} userName={userName} userRole={role || ""} />
      <main className="container mx-auto px-4 py-6 pb-20 sm:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            Feedback & Complaints
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "View and manage student feedback" : "Submit feedback or complaints"}
          </p>
        </div>

        {/* Submit Form (non-admin) */}
        {!isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">Submit Feedback</CardTitle>
              <CardDescription>Share your concerns or suggestions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
              <Textarea placeholder="Describe your feedback in detail..." value={message} onChange={e => setMessage(e.target.value)} rows={4} />
              <Button onClick={() => submitMutation.mutate()} disabled={!subject || !message || submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit
              </Button>
            </CardContent>
          </Card>
        )}

        {/* AI Analyzer (Admin only) */}
        {isAdmin && (
          <Card className="mb-6 border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Brain className="h-5 w-5" />
                AI Feedback Analyzer
              </CardTitle>
              <CardDescription>Automatically group and prioritize student feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={analyzeWithAI} disabled={analyzing} className="mb-4">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                Analyze Pending Feedback
              </Button>
              {aiSummary && (
                <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm text-foreground">
                  {aiSummary}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{isAdmin ? "All Feedback" : "Your Feedback"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : feedbackList && feedbackList.length > 0 ? (
              <div className="space-y-4">
                {feedbackList.map((fb: any) => (
                  <div key={fb.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline">{fb.category}</Badge>
                          {statusBadge(fb.status)}
                          {isAdmin && fb.profiles && (
                            <span className="text-xs text-muted-foreground">by {fb.profiles.name}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground">{fb.subject}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{fb.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{format(new Date(fb.created_at), "PPp")}</p>
                        {fb.admin_response && (
                          <div className="mt-3 p-3 rounded bg-primary/5 border-l-4 border-primary">
                            <p className="text-xs font-medium text-primary mb-1">Admin Response</p>
                            <p className="text-sm text-foreground">{fb.admin_response}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {isAdmin && fb.status !== "resolved" && (
                          <Dialog open={respondingTo === fb.id} onOpenChange={(open) => { if (!open) setRespondingTo(null); }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setRespondingTo(fb.id)}>Respond</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Respond to Feedback</DialogTitle></DialogHeader>
                              <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Type your response..." rows={4} />
                              <Button onClick={() => respondMutation.mutate({ id: fb.id, response: responseText })} disabled={!responseText}>
                                Send Response
                              </Button>
                            </DialogContent>
                          </Dialog>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(fb.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No feedback yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
