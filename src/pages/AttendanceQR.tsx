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
import { Html5Qrcode } from "html5-qrcode";
import { CalendarIcon, QrCode, Scan, Camera, CameraOff, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const QR_READER_ID = "qr-reader-container";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    checkAuth();
    
    return () => {
      isMountedRef.current = false;
      forceCleanup();
    };
  }, []);

  useEffect(() => {
    if (!roleLoading && role === "STUDENT" && userId) {
      fetchStudentData(userId);
    }
  }, [role, roleLoading, userId]);

  const forceCleanup = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      html5QrCodeRef.current = null;
    }
  };

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

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera API not supported. Please use a modern browser like Chrome or Safari.");
        return false;
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      return true;
    } catch (error: any) {
      console.error("Camera permission error:", error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError("Camera permission denied. Please allow camera access in your browser/phone settings and try again.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError("No camera found. Please make sure your device has a camera.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError("Camera is being used by another app. Please close other apps and try again.");
      } else if (error.name === 'OverconstrainedError') {
        // Try with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          return true;
        } catch {
          setCameraError("Camera not compatible. Please try a different browser.");
        }
      } else {
        setCameraError(`Camera error: ${error.message || 'Please check your camera settings.'}`);
      }
      
      return false;
    }
  };

  const startScanning = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setCameraError(null);
    setScanSuccess(false);
    setScanning(true);
    setCameraReady(false);

    // Clean up any existing scanner first
    await forceCleanup();

    // Request camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setScanning(false);
      setIsProcessing(false);
      return;
    }

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!isMountedRef.current) {
      setIsProcessing(false);
      return;
    }

    const container = document.getElementById(QR_READER_ID);
    if (!container) {
      setCameraError("Scanner container not ready. Please refresh the page.");
      setScanning(false);
      setIsProcessing(false);
      return;
    }

    try {
      // Create fresh scanner instance
      const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
      html5QrCodeRef.current = scanner;

      const qrConfig = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: "environment" },
        qrConfig,
        async (decodedText) => {
          if (!isMountedRef.current) return;
          
          console.log("QR Code detected:", decodedText);
          setScanSuccess(true);
          
          try {
            const qrPayload = JSON.parse(decodedText);
            await stopScanning();
            await markAttendance(qrPayload);
          } catch (parseError) {
            console.error("QR parse error:", parseError);
            toast({
              title: "Invalid QR Code",
              description: "This doesn't appear to be a valid attendance QR code",
              variant: "destructive",
            });
            setScanSuccess(false);
          }
        },
        () => {
          // Scanning in progress - no action needed
        }
      );

      if (isMountedRef.current) {
        setCameraReady(true);
        toast({
          title: "Camera Ready",
          description: "Point at the QR code to mark attendance",
        });
      }
    } catch (error: any) {
      console.error("Scanner start error:", error);
      
      if (isMountedRef.current) {
        if (error.message?.toLowerCase().includes("permission")) {
          setCameraError("Camera permission denied. Go to browser settings to allow camera access.");
        } else if (error.message?.toLowerCase().includes("not found") || error.message?.toLowerCase().includes("no camera")) {
          setCameraError("No camera detected. Please check your device.");
        } else if (error.message?.toLowerCase().includes("already started")) {
          setCameraError("Camera is already in use. Please refresh the page.");
        } else {
          setCameraError(error.message || "Failed to start camera. Please try again.");
        }
        setScanning(false);
      }
      await forceCleanup();
    } finally {
      setIsProcessing(false);
    }
  };

  const stopScanning = useCallback(async () => {
    await forceCleanup();
    if (isMountedRef.current) {
      setScanning(false);
      setCameraReady(false);
    }
  }, []);

  const retryCamera = async () => {
    setCameraError(null);
    await startScanning();
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
        .maybeSingle();

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
                  <AlertDescription className="flex flex-col gap-2">
                    <span>{cameraError}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={retryCamera}
                      className="w-fit mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Camera Permission Info */}
              {!scanning && !cameraError && !scanSuccess && (
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Allow camera access when prompted. For best results:
                    <ul className="list-disc ml-4 mt-1 text-xs">
                      <li>Use Chrome or Safari browser</li>
                      <li>Ensure good lighting</li>
                      <li>Hold the QR code steady</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Scanner Container */}
              <div 
                id={QR_READER_ID}
                className={cn(
                  "w-full rounded-lg overflow-hidden bg-black mx-auto transition-all duration-300",
                  scanning ? "min-h-[280px] sm:min-h-[350px] max-w-md border-2 border-primary" : "h-0"
                )}
                style={{ display: scanning ? 'block' : 'none' }}
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
                  disabled={!studentId || isProcessing}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isProcessing ? "Starting..." : studentId ? "Open Camera to Scan" : "Loading student data..."}
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
                💡 Tip: If camera doesn't start, try refreshing the page or use a different browser
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
