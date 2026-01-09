import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";

const LEAVE_TYPES = [
  { value: "regular", label: "Regular Leave", credit: 0, description: "No attendance credit" },
  { value: "medical", label: "Medical Leave", credit: 10, description: "10% attendance credit" },
  { value: "critical", label: "Critical/Emergency", credit: 75, description: "75% attendance credit" },
];

export default function LeaveManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newLeave, setNewLeave] = useState({
    subject: "",
    reason: "",
    startDate: "",
    endDate: "",
    leaveType: "regular",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!roleLoading && role === "STUDENT" && userId) {
      fetchStudentId(userId);
    }
    if (!roleLoading && role) {
      fetchLeaveRequests();
    }
  }, [role, roleLoading, userId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const [profileRes, subjectsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("subjects").select("*").order("name"),
      ]);

      setProfile(profileRes.data);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentId = async (userIdParam: string) => {
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userIdParam)
      .maybeSingle();
    
    if (studentData) {
      setStudentId(studentData.id);
    } else {
      toast({
        title: "Student Record Not Found",
        description: "Please contact administrator to set up your student record.",
        variant: "destructive",
      });
    }
  };

  const fetchLeaveRequests = async () => {
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

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

    if (!studentId) {
      toast({
        title: "Error",
        description: "Student ID not found. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    try {
      const leaveTypeInfo = LEAVE_TYPES.find(t => t.value === newLeave.leaveType);
      const attendanceCredit = leaveTypeInfo?.credit || 0;

      const { error } = await supabase
        .from("leave_requests")
        .insert({
          student_id: studentId,
          subject: newLeave.subject,
          reason: newLeave.reason,
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          status: "PENDING",
          leave_type: newLeave.leaveType,
          attendance_credit: attendanceCredit,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      setNewLeave({ subject: "", reason: "", startDate: "", endDate: "", leaveType: "regular" });
      setDialogOpen(false);
      await fetchLeaveRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: string, remarks?: string) => {
    try {
      // Get leave request details first
      const { data: leaveRequest } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", leaveId)
        .single();

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          teacher_id: user.id,
          teacher_remarks: remarks,
        })
        .eq("id", leaveId);

      if (error) throw error;

      // If approved, mark attendance based on leave type
      if (status === "APPROVED" && leaveRequest) {
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        const attendanceCredit = leaveRequest.attendance_credit || 0;
        const leaveType = leaveRequest.leave_type || "regular";

        // Create attendance records for each day of leave
        const attendanceRecords = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Only mark as present if there's attendance credit
          if (attendanceCredit > 0) {
            attendanceRecords.push({
              student_id: leaveRequest.student_id,
              subject: leaveRequest.subject,
              date: new Date(d).toISOString().split("T")[0],
              status: "PRESENT" as const,
              marked_by: user.id,
            });
          }
        }

        if (attendanceRecords.length > 0) {
          await supabase.from("attendance").upsert(attendanceRecords, { 
            onConflict: "student_id,subject,date",
            ignoreDuplicates: true 
          });
        }

        let message = `Leave approved for ${leaveType} leave.`;
        if (attendanceCredit > 0) {
          message += ` ${attendanceCredit}% attendance credit applied.`;
        }

        toast({
          title: "Success",
          description: message,
        });
      } else {
        toast({
          title: "Success",
          description: `Leave request ${status.toLowerCase()}`,
        });
      }

      fetchLeaveRequests();
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

  const getLeaveTypeBadge = (leaveType: string, credit: number) => {
    if (leaveType === "medical") {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-600">
          <Heart className="h-3 w-3" />
          Medical ({credit}%)
        </Badge>
      );
    }
    if (leaveType === "critical") {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-red-500 text-red-600">
          <AlertTriangle className="h-3 w-3" />
          Critical ({credit}%)
        </Badge>
      );
    }
    return <Badge variant="outline">Regular</Badge>;
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <FloatingGeometry variant="colorful" />
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Leave Management
            </h1>
            <p className="text-muted-foreground">Submit and track leave requests</p>
          </div>
          {role === "STUDENT" && studentId && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary hover-scale transition-smooth">
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
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select value={newLeave.leaveType} onValueChange={(value) => setNewLeave({ ...newLeave, leaveType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {LEAVE_TYPES.find(t => t.value === newLeave.leaveType)?.description}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={newLeave.subject} onValueChange={(value) => setNewLeave({ ...newLeave, subject: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.name}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {newLeave.startDate && newLeave.endDate && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Duration:</span> {calculateLeaveDays(newLeave.startDate, newLeave.endDate)} day(s)
                      </p>
                      {newLeave.leaveType !== "regular" && (
                        <p className="text-sm text-primary">
                          <span className="font-medium">Attendance Credit:</span> {LEAVE_TYPES.find(t => t.value === newLeave.leaveType)?.credit}% of leave days
                        </p>
                      )}
                    </div>
                  )}
                  <Button onClick={handleCreateLeave} className="w-full gradient-primary">
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <Card key={request.id} className="shadow-lg hover:shadow-xl transition-smooth border-primary/20 animate-fade-in hover-scale">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{request.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {role !== "STUDENT" && (
                        <>
                          Student: {request.students?.profiles?.name} ({request.students?.roll_number})
                          <br />
                        </>
                      )}
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      {" "}({calculateLeaveDays(request.start_date, request.end_date)} days)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getLeaveTypeBadge(request.leave_type || "regular", request.attendance_credit || 0)}
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

                  {(role === "FACULTY" || role === "ADMIN") && request.status === "PENDING" && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateLeaveStatus(request.id, "APPROVED", "Approved")}
                        className="flex-1 min-w-[120px] gradient-primary hover-scale transition-smooth"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateLeaveStatus(request.id, "REJECTED", "Rejected")}
                        className="flex-1 min-w-[120px] hover-scale transition-smooth"
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
            <Card className="shadow-lg">
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
