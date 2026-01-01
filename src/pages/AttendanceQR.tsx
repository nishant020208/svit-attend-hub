import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { CalendarIcon, QrCode, Scan, Camera, CameraOff, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const QR_READER_ID = "qr-reader-element";

export default function AttendanceQR() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerMountedRef = useRef(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

  useEffect(() => {
    if (!roleLoading && role === "STUDENT" && userId) {
      fetchStudentData(userId);
    }
  }, [role, roleLoading, userId]);

  const cleanupScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (error) {
        console.log("Cleanup error (safe to ignore):", error);
      }
      html5QrCodeRef.current = null;
    }
    scannerMountedRef.current = false;
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
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (userIdParam: string) => {
    const { data: studentData } = await supabase
      .from("students")
      .select("id, course, year, section")
      .eq("user_id", userIdParam)
      .single();
    
    if (studentData) {
      setStudentId(studentData.id);
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

  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      // First check if we can enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setCameraError("No camera found on this device");
        return false;
      }

      // Try to get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error: any) {
      console.error("Camera permission error:", error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError("No camera found on this device.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError("Camera is in use by another application. Please close other apps using the camera.");
      } else if (error.name === 'OverconstrainedError') {
        setCameraError("Camera constraints not supported. Try using a different browser.");
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
      }
      
      return false;
    }
  };

  const startScanning = async () => {
    setCameraError(null);
    setScanSuccess(false);
    setScanning(true);
    setCameraReady(false);

    // Wait for the DOM element to be rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    const readerElement = document.getElementById(QR_READER_ID);
    if (!readerElement) {
      setCameraError("Scanner container not found. Please refresh and try again.");
      setScanning(false);
      return;
    }

    // Check camera permission first
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      setScanning(false);
      return;
    }

    try {
      // Cleanup any existing instance
      await cleanupScanner();

      // Create new instance
      html5QrCodeRef.current = new Html5Qrcode(QR_READER_ID);
      scannerMountedRef.current = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          console.log("QR Code scanned:", decodedText);
          try {
            const qrPayload = JSON.parse(decodedText);
            setScanSuccess(true);
            await stopScanning();
            await markAttendance(qrPayload);
          } catch (error) {
            console.error("QR parse error:", error);
            toast({
              title: "Invalid QR Code",
              description: "This doesn't appear to be a valid attendance QR code",
              variant: "destructive",
            });
          }
        },
        () => {
          // QR code scanning in progress - no action needed for failed frames
        }
      );

      setCameraReady(true);
      toast({
        title: "Camera Started",
        description: "Point your camera at the attendance QR code",
      });
    } catch (error: any) {
      console.error("Scanner start error:", error);
      
      let errorMessage = "Failed to start camera";
      if (error.message?.includes("Permission")) {
        errorMessage = "Camera permission denied. Please allow camera access.";
      } else if (error.message?.includes("NotFound") || error.message?.includes("not found")) {
        errorMessage = "No camera found on this device.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      setScanning(false);
      await cleanupScanner();
    }
  };

  const stopScanning = async () => {
    await cleanupScanner();
    setScanning(false);
    setCameraReady(false);
  };

  const markAttendance = async (qrPayload: any) => {
    if (!studentId) {
      toast({
        title: "Error",
        description: "Student record not found. Please contact admin.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if attendance already marked
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", studentId)
        .eq("subject", qrPayload.subject)
        .eq("date", qrPayload.date)
        .single();

      if (existing) {
        toast({
          title: "Already Marked",
          description: "Your attendance for this class has already been recorded",
          variant: "default",
        });
        return;
      }

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
        title: "Attendance Marked!",
        description: `Your attendance for ${qrPayload.subject} has been recorded.`,
      });
    } catch (error: any) {
      console.error("Attendance error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 sm:pb-0">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            QR Attendance System
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Scan or generate QR codes for attendance</p>
        </div>

        {role === "FACULTY" || role === "ADMIN" ? (
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
                <div className="flex flex-col items-center p-6 sm:p-8 bg-white rounded-lg shadow-inner">
                  <QRCodeSVG value={qrData} size={256} level="H" />
                  <p className="mt-4 text-sm text-gray-600 text-center">Students can scan this QR code to mark attendance</p>
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
              <CardDescription>Scan the QR code shown by your teacher to mark attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Success Message */}
              {scanSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    QR Code scanned successfully! Processing your attendance...
                  </AlertDescription>
                </Alert>
              )}

              {/* Camera Error */}
              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}

              {/* Camera Permission Info */}
              {!scanning && !cameraError && (
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    Make sure to allow camera access when prompted. The camera will be used to scan the QR code.
                  </AlertDescription>
                </Alert>
              )}

              {/* Scanner Container - Always in DOM but hidden when not scanning */}
              <div 
                id={QR_READER_ID}
                className={cn(
                  "w-full rounded-lg overflow-hidden border-2 border-border bg-black transition-all",
                  scanning ? "min-h-[300px] sm:min-h-[400px]" : "h-0 border-0"
                )}
              />

              {/* Camera Status */}
              {scanning && !cameraReady && !cameraError && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Starting camera...</span>
                </div>
              )}
              
              {scanning && cameraReady && (
                <p className="text-sm text-center text-muted-foreground animate-pulse">
                  📷 Camera is active. Point at the QR code to scan.
                </p>
              )}

              {/* Action Buttons */}
              {!scanning ? (
                <Button 
                  onClick={startScanning} 
                  className="w-full gradient-primary hover-scale transition-smooth"
                  disabled={!studentId}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {studentId ? "Start Camera to Scan" : "Loading student data..."}
                </Button>
              ) : (
                <Button 
                  onClick={stopScanning} 
                  variant="destructive" 
                  className="w-full hover-scale transition-smooth"
                >
                  <CameraOff className="mr-2 h-4 w-4" />
                  Stop Camera
                </Button>
              )}

              {/* Help Text */}
              <p className="text-xs text-center text-muted-foreground">
                Tip: Make sure you're in a well-lit area and hold your camera steady
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
