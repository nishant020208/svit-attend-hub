import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { CalendarIcon, QrCode, Scan } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AttendanceQR() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>("");

  // QR Generation (Teacher)
  const [qrData, setQrData] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();

  // QR Scanning (Student)
  const [scanning, setScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop();
      }
    };
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
          .select("id, course, year, section")
          .eq("user_id", session.user.id)
          .single();
        
        if (studentData) {
          setStudentId(studentData.id);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = () => {
    if (!selectedCourse || !selectedYear || !selectedSection || !selectedSubject || !subjectCode || !selectedDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const qrPayload = {
      course: selectedCourse,
      year: selectedYear,
      section: selectedSection,
      subject: selectedSubject,
      subjectCode: subjectCode,
      date: format(selectedDate, "yyyy-MM-dd"),
      teacherId: user.id,
      timestamp: Date.now(),
    };

    setQrData(JSON.stringify(qrPayload));
    toast({
      title: "Success",
      description: "QR Code generated successfully",
    });
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      const qrCode = new Html5Qrcode("qr-reader");
      setHtml5QrCode(qrCode);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          try {
            const qrPayload = JSON.parse(decodedText);
            await markAttendance(qrPayload);
            await qrCode.stop();
            setScanning(false);
          } catch (error) {
            console.error("QR scan error:", error);
          }
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );

      toast({
        title: "Camera Started",
        description: "Point your camera at the QR code",
      });
    } catch (error: any) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: error.message || "Failed to start camera. Please check permissions.",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCode?.isScanning) {
      await html5QrCode.stop();
      setScanning(false);
    }
  };

  const markAttendance = async (qrPayload: any) => {
    try {
      const { error } = await supabase
        .from("attendance")
        .insert({
          student_id: studentId,
          subject: qrPayload.subject,
          date: qrPayload.date,
          status: "PRESENT",
          marked_by: qrPayload.teacherId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            QR Attendance System
          </h1>
          <p className="text-muted-foreground">Scan or generate QR codes for attendance</p>
        </div>

        {profile?.role === "FACULTY" || profile?.role === "ADMIN" ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Generate QR Code
              </CardTitle>
              <CardDescription>Create a QR code for students to scan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    placeholder="e.g., B.Tech"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    placeholder="e.g., A"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Data Structures"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                    id="subjectCode"
                    placeholder="e.g., CS201"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <Button onClick={generateQRCode} className="w-full gradient-primary mb-6">
                <QrCode className="mr-2 h-4 w-4" />
                Generate QR Code
              </Button>

              {qrData && (
                <div className="flex flex-col items-center p-8 bg-white rounded-lg shadow-inner">
                  <QRCodeSVG value={qrData} size={256} level="H" />
                  <p className="mt-4 text-sm text-muted-foreground">Students can scan this QR code to mark attendance</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>Scan the QR code shown by your teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden border-2 border-border bg-black"
                style={{ minHeight: scanning ? "400px" : "0", display: scanning ? "block" : "none" }}
              />
              
              {!scanning ? (
                <Button onClick={startScanning} className="w-full gradient-primary hover-scale transition-smooth">
                  <Scan className="mr-2 h-4 w-4" />
                  Start Camera to Scan
                </Button>
              ) : (
                <>
                  <p className="text-sm text-center text-muted-foreground animate-pulse">
                    Camera is active. Point at QR code to scan.
                  </p>
                  <Button onClick={stopScanning} variant="destructive" className="w-full hover-scale transition-smooth">
                    Stop Scanning
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
