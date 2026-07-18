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
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, Heart, Percent, Paperclip, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const ALLOWED_LEAVE_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
const MAX_LEAVE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; leaveId: string; leaveType: string; credit: number }>({
    open: false, leaveId: "", leaveType: "", credit: 0
  });
  const [customCredit, setCustomCredit] = useState("");
  const [teacherRemarks, setTeacherRemarks] = useState("");
  
  const [newLeave, setNewLeave] = useState({
    subject: "",
    reason: "",
    startDate: "",
    endDate: "",
    leaveType: "regular",
  });
  const [leaveFile, setLeaveFile] = useState<File | null>(null);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!roleLoading && role === "STUDENT" && userId) fetchStudentId(userId);
    if (!roleLoading && role) fetchLeaveRequests();
  }, [role, roleLoading, userId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
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
      .from("students").select("id").eq("user_id", userIdParam).maybeSingle();
    if (studentData) setStudentId(studentData.id);
    else toast({ title: "Student Record Not Found", description: "Contact administrator.", variant: "destructive" });
  };

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`*, students (roll_number, profiles:user_id (name, email)), teacher:teacher_id (name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleCreateLeave = async () => {
    if (!newLeave.subject || !newLeave.reason || !newLeave.startDate || !newLeave.endDate) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!studentId) {
      toast({ title: "Error", description: "Student ID not found.", variant: "destructive" });
      return;
    }

    // Validate file if provided
    if (leaveFile) {
      if (!ALLOWED_LEAVE_FILE_TYPES.includes(leaveFile.type)) {
        toast({ title: "Invalid File", description: "Only PDF, DOC/DOCX, JPG, PNG files are allowed", variant: "destructive" });
        return;
      }
      if (leaveFile.size > MAX_LEAVE_FILE_SIZE) {
        toast({ title: "File Too Large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }
    }

    try {
      let attachmentUrl = null;
      if (leaveFile) {
        const fileExt = leaveFile.name.split('.').pop();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        const fileName = `${authUser.id}/${Date.now()}_${studentId}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('leave-attachments').upload(fileName, leaveFile);
        if (uploadError) throw uploadError;
        attachmentUrl = fileName;
      }

      const leaveTypeInfo = LEAVE_TYPES.find(t => t.value === newLeave.leaveType);
      const { error } = await supabase.from("leave_requests").insert({
        student_id: studentId,
        subject: newLeave.subject,
        reason: newLeave.reason,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        status: "PENDING",
        leave_type: newLeave.leaveType,
        attendance_credit: leaveTypeInfo?.credit || 0,
        attachment_url: attachmentUrl,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Leave request submitted" });
      setNewLeave({ subject: "", reason: "", startDate: "", endDate: "", leaveType: "regular" });
      setLeaveFile(null);
      setDialogOpen(false);
      await fetchLeaveRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openApprovalDialog = (leaveId: string, leaveType: string, credit: number) => {
    setApprovalDialog({ open: true, leaveId, leaveType, credit });
    setCustomCredit(String(credit));
    setTeacherRemarks("");
  };

  const handleApproveWithCredit = async () => {
    const creditValue = Math.min(100, Math.max(0, parseInt(customCredit) || 0));
    try {
      const { data: leaveRequest } = await supabase
        .from("leave_requests").select("*").eq("id", approvalDialog.leaveId).single();

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "APPROVED",
          teacher_id: user.id,
          teacher_remarks: teacherRemarks || `Approved with ${creditValue}% attendance credit`,
          attendance_credit: creditValue,
        })
        .eq("id", approvalDialog.leaveId);
      if (error) throw error;

      // If credit > 0, mark attendance for leave days
      if (creditValue > 0 && leaveRequest) {
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        const attendanceRecords = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          attendanceRecords.push({
            student_id: leaveRequest.student_id,
            subject: leaveRequest.subject,
            date: new Date(d).toISOString().split("T")[0],
            status: "PRESENT" as const,
            marked_by: user.id,
          });
        }
        if (attendanceRecords.length > 0) {
          await supabase.from("attendance").upsert(attendanceRecords, {
            onConflict: "student_id,subject,date",
            ignoreDuplicates: true,
          });
        }
      }

      toast({ title: "Approved", description: `Leave approved with ${creditValue}% attendance credit` });
      setApprovalDialog({ open: false, leaveId: "", leaveType: "", credit: 0 });
      fetchLeaveRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "REJECTED", teacher_id: user.id, teacher_remarks: "Rejected" })
        .eq("id", leaveId);
      if (error) throw error;
      toast({ title: "Rejected", description: "Leave request rejected" });
      fetchLeaveRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const getLeaveTypeBadge = (leaveType: string) => {
    if (leaveType === "medical") return <Badge variant="outline" className="border-blue-400 text-blue-600"><Heart className="h-3 w-3 mr-1" />Medical</Badge>;
    if (leaveType === "critical") return <Badge variant="outline" className="border-red-400 text-red-600"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
    return <Badge variant="outline">Regular</Badge>;
  };

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
            <p className="text-muted-foreground">Submit and track leave requests</p>
          </div>
          {role === "STUDENT" && studentId && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
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
                    <Label>Leave Type</Label>
                    <Select value={newLeave.leaveType} onValueChange={(v) => setNewLeave({ ...newLeave, leaveType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAVE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {LEAVE_TYPES.find(t => t.value === newLeave.leaveType)?.description}
                    </p>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={newLeave.subject} onValueChange={(v) => setNewLeave({ ...newLeave, subject: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name} ({s.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea placeholder="Explain your reason..." rows={3} value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Attachment (PDF, DOC, JPG, PNG)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                      />
                      {leaveFile && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Max 10MB. Optional supporting document.</p>
                  </div>
                  {newLeave.startDate && newLeave.endDate && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Duration:</span> {calculateLeaveDays(newLeave.startDate, newLeave.endDate)} day(s)
                      </p>
                    </div>
                  )}
                  <Button onClick={handleCreateLeave} className="w-full gradient-primary">Submit Request</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Teacher Approval Dialog */}
        <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Leave — Set Attendance Credit</DialogTitle>
              <DialogDescription>
                Decide how much attendance credit to give based on the reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <p className="text-sm font-medium text-foreground capitalize">{approvalDialog.leaveType}</p>
                <p className="text-xs text-muted-foreground">
                  Default credit: {LEAVE_TYPES.find(t => t.value === approvalDialog.leaveType)?.credit || 0}%
                </p>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Attendance Credit (0-100%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customCredit}
                  onChange={(e) => setCustomCredit(e.target.value)}
                  placeholder="Enter percentage"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This % of leave days will count as present in attendance.
                </p>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  placeholder="Add remarks for the student..."
                  rows={2}
                  value={teacherRemarks}
                  onChange={(e) => setTeacherRemarks(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApproveWithCredit} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setApprovalDialog(prev => ({ ...prev, open: false }))} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <Card key={request.id} className={`border-l-4 ${
              request.status === "APPROVED" ? "border-l-green-500" :
              request.status === "REJECTED" ? "border-l-red-500" : "border-l-yellow-500"
            }`}>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{request.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {role !== "STUDENT" && (
                        <>Student: {request.students?.profiles?.name} ({request.students?.roll_number})<br /></>
                      )}
                      {new Date(request.start_date).toLocaleDateString()} — {new Date(request.end_date).toLocaleDateString()}
                      {" "}({calculateLeaveDays(request.start_date, request.end_date)} days)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getLeaveTypeBadge(request.leave_type || "regular")}
                    {getStatusBadge(request.status)}
                    {request.status === "APPROVED" && request.attendance_credit > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0">
                        {request.attendance_credit}% credit
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{request.reason}</p>

                  {request.attachment_url && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const { data } = await supabase.storage.from('leave-attachments').createSignedUrl(request.attachment_url, 3600);
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    }}>
                      <Download className="mr-2 h-4 w-4" />View Attachment
                    </Button>
                  )}
                  
                  {request.teacher_remarks && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Teacher's Remarks:</p>
                      <p className="text-sm text-muted-foreground">{request.teacher_remarks}</p>
                      {request.teacher && (
                        <p className="text-xs text-muted-foreground mt-1">— {request.teacher.name}</p>
                      )}
                    </div>
                  )}

                  {(role === "FACULTY" || role === "ADMIN") && request.status === "PENDING" && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => openApprovalDialog(request.id, request.leave_type || "regular", request.attendance_credit || 0)}
                        className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
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
