import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LeaveManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newLeave, setNewLeave] = useState({
    subject: "",
    reason: "",
    startDate: "",
    endDate: "",
  });

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      if (profileData?.role === "STUDENT") {
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
        
        if (studentData) {
          setStudentId(studentData.id);
        }
      }

      await fetchLeaveRequests(profileData?.role);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async (role: string) => {
    try {
      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          students (
            roll_number,
            profiles:user_id (name, email)
          ),
          teacher:teacher_id (name)
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const handleCreateLeave = async () => {
    if (!newLeave.subject || !newLeave.reason || !newLeave.startDate || !newLeave.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("leave_requests")
        .insert({
          student_id: studentId,
          subject: newLeave.subject,
          reason: newLeave.reason,
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          status: "PENDING",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      setNewLeave({ subject: "", reason: "", startDate: "", endDate: "" });
      setDialogOpen(false);
      fetchLeaveRequests(profile?.role);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: string, remarks?: string) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          teacher_id: user.id,
          teacher_remarks: remarks,
        })
        .eq("id", leaveId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Leave request ${status.toLowerCase()}`,
      });

      fetchLeaveRequests(profile?.role);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDING: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
      APPROVED: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      REJECTED: { variant: "destructive", icon: XCircle, color: "text-red-600" },
    };
    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground">Submit and track leave requests</p>
          </div>
          {profile?.role === "STUDENT" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Request Leave
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit Leave Request</DialogTitle>
                  <DialogDescription>Fill in the details for your leave request</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Data Structures"
                      value={newLeave.subject}
                      onChange={(e) => setNewLeave({ ...newLeave, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      placeholder="Explain your reason for leave..."
                      rows={4}
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateLeave} className="w-full">
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <Card key={request.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{request.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {profile?.role !== "STUDENT" && (
                        <>
                          Student: {request.students?.profiles?.name} ({request.students?.roll_number})
                          <br />
                        </>
                      )}
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                  
                  {request.teacher_remarks && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Teacher's Remarks:</p>
                      <p className="text-sm text-muted-foreground">{request.teacher_remarks}</p>
                      {request.teacher && (
                        <p className="text-xs text-muted-foreground mt-1">- {request.teacher.name}</p>
                      )}
                    </div>
                  )}

                  {(profile?.role === "FACULTY" || profile?.role === "ADMIN") && request.status === "PENDING" && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateLeaveStatus(request.id, "APPROVED", "Approved")}
                        className="flex-1 min-w-[120px]"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateLeaveStatus(request.id, "REJECTED", "Rejected")}
                        className="flex-1 min-w-[120px]"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {leaveRequests.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center">No leave requests yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
