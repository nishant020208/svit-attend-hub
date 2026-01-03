import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link2, RefreshCw, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface RelationRow {
  id: string;
  created_at: string;
  relation_type: string;
  parent?: { id: string; name: string; email: string } | null;
  student?: {
    id: string;
    roll_number: string;
    course: string;
    year: number;
    section: string;
    profiles?: { id: string; name: string; email: string } | null;
  } | null;
}

export default function ParentLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canView = role === "ADMIN";

  const title = useMemo(() => "Parent–Student Links", []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profileData);
      } catch {
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (roleLoading) return;
    if (role && role !== "ADMIN") {
      navigate("/dashboard");
      return;
    }
    if (role === "ADMIN") {
      void fetchRelations();
    }
  }, [role, roleLoading, navigate]);

  const fetchRelations = async () => {
    try {
      const { data, error } = await supabase
        .from("parent_student_relation")
        .select(
          `
          id,
          created_at,
          relation_type,
          parent:parent_id ( id, name, email ),
          student:student_id (
            id,
            roll_number,
            course,
            year,
            section,
            profiles:user_id ( id, name, email )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRelations((data as any) ?? []);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load relations",
        variant: "destructive",
      });
    }
  };

  const handleLink = async () => {
    if (!parentEmail || !studentEmail) {
      toast({
        title: "Missing info",
        description: "Enter both parent email and student email",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: parentProfile, error: parentProfileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", parentEmail)
        .maybeSingle();

      if (parentProfileError || !parentProfile) {
        throw new Error("Parent not found with this email");
      }

      const { data: parentRoleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", parentProfile.id)
        .maybeSingle();

      if (parentRoleRow?.role !== "PARENT") {
        throw new Error("That email is not a parent account");
      }

      const { data: studentProfile, error: studentProfileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", studentEmail)
        .maybeSingle();

      if (studentProfileError || !studentProfile) {
        throw new Error("Student not found with this email");
      }

      const { data: studentRoleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", studentProfile.id)
        .maybeSingle();

      if (studentRoleRow?.role !== "STUDENT") {
        throw new Error("That email is not a student account");
      }

      const { data: studentRow, error: studentRowError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", studentProfile.id)
        .maybeSingle();

      if (studentRowError || !studentRow) {
        throw new Error("Student record not found");
      }

      // prevent duplicates
      const { data: existing } = await supabase
        .from("parent_student_relation")
        .select("id")
        .eq("parent_id", parentProfile.id)
        .eq("student_id", studentRow.id)
        .maybeSingle();

      if (existing?.id) {
        toast({ title: "Already linked", description: "This student is already linked to this parent." });
        return;
      }

      const { error: insertError } = await supabase.from("parent_student_relation").insert({
        parent_id: parentProfile.id,
        student_id: studentRow.id,
        relation_type: "PARENT",
      });

      if (insertError) throw insertError;

      toast({ title: "Linked", description: "Parent linked to student successfully." });
      setParentEmail("");
      setStudentEmail("");
      await fetchRelations();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to link parent and student",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async (relationId: string) => {
    try {
      const { error } = await supabase.from("parent_student_relation").delete().eq("id", relationId);
      if (error) throw error;
      toast({ title: "Removed", description: "Link removed." });
      await fetchRelations();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to remove link",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) return <LoadingSpinner />;
  if (!canView) return null;

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">Link parent accounts to student records for secure access (no password sharing).</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Create Link
            </CardTitle>
            <CardDescription>Enter parent email and student email.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Parent Email</Label>
              <Input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Student Email</Label>
              <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@example.com" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <Button onClick={handleLink} disabled={submitting} className="gap-2">
                <Link2 className="h-4 w-4" />
                {submitting ? "Linking..." : "Link"}
              </Button>
              <Button variant="outline" onClick={fetchRelations} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Links</CardTitle>
            <CardDescription>Manage current parent–student relationships.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No links yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    relations.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.parent?.email || "—"}</TableCell>
                        <TableCell>{r.student?.profiles?.name || r.student?.profiles?.email || "—"}</TableCell>
                        <TableCell>{r.student?.roll_number || "—"}</TableCell>
                        <TableCell>
                          {r.student ? `${r.student.course} / Y${r.student.year} / ${r.student.section}` : "—"}
                        </TableCell>
                        <TableCell>{r.relation_type}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleUnlink(r.id)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
