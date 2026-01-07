import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Scan, Camera, CameraOff, AlertCircle, CheckCircle, RefreshCw, Book, Clock, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { differenceInDays, format, addDays } from "date-fns";

const QR_READER_ID = "library-qr-reader";

export default function LibraryQR() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>("");

  // Book management
  const [books, setBooks] = useState<any[]>([]);
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [newBookName, setNewBookName] = useState("");
  const [newBookCode, setNewBookCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // QR Generation (Librarian)
  const [qrData, setQrData] = useState("");
  const [selectedBook, setSelectedBook] = useState<any>(null);

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
    if (!roleLoading && userId) {
      if (role === "STUDENT") {
        fetchStudentData(userId);
        fetchStudentBorrowings();
      }
      if (role === "LIBRARIAN" || role === "ADMIN") {
        fetchBooks();
        fetchAllBorrowings();
      }
    }
  }, [role, roleLoading, userId]);

  const forceCleanup = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
      try {
        html5QrCodeRef.current.clear();
      } catch (e) {}
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
      .select("id")
      .eq("user_id", userIdParam)
      .single();
    if (studentData) {
      setStudentId(studentData.id);
    }
  };

  const fetchBooks = async () => {
    const { data } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    setBooks(data || []);
  };

  const fetchStudentBorrowings = async () => {
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (!studentData) return;

    const { data } = await supabase
      .from("book_borrowings")
      .select("*, books(*)")
      .eq("student_id", studentData.id)
      .order("borrowed_at", { ascending: false });
    setBorrowings(data || []);
  };

  const fetchAllBorrowings = async () => {
    const { data } = await supabase
      .from("book_borrowings")
      .select("*, books(*)")
      .order("borrowed_at", { ascending: false });
    setBorrowings(data || []);
  };

  const handleAddBook = async () => {
    if (!newBookName || !newBookCode) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("books")
      .insert({ name: newBookName, code: newBookCode, added_by: user.id });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Book added successfully" });
    setNewBookName("");
    setNewBookCode("");
    setDialogOpen(false);
    fetchBooks();
  };

  const generateBookQR = (book: any) => {
    const qrPayload = {
      type: "LIBRARY_BOOK",
      bookId: book.id,
      bookName: book.name,
      bookCode: book.code,
      librarianId: user.id,
      timestamp: Date.now(),
    };
    setSelectedBook(book);
    setQrData(JSON.stringify(qrPayload));
    toast({ title: "QR Generated", description: `QR code for "${book.name}" is ready for scanning` });
  };

  const startScanning = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCameraError(null);
    setScanSuccess(false);
    setScanning(true);
    setCameraReady(false);

    await forceCleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error: any) {
      setCameraError("Camera permission denied");
      setScanning(false);
      setIsProcessing(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    if (!isMountedRef.current) { setIsProcessing(false); return; }

    const container = document.getElementById(QR_READER_ID);
    if (!container) {
      setCameraError("Scanner container not ready");
      setScanning(false);
      setIsProcessing(false);
      return;
    }

    try {
      const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (!isMountedRef.current) return;
          setScanSuccess(true);
          try {
            const qrPayload = JSON.parse(decodedText);
            await stopScanning();
            await borrowBook(qrPayload);
          } catch {
            toast({ title: "Invalid QR Code", description: "This is not a valid library QR code", variant: "destructive" });
            setScanSuccess(false);
          }
        },
        () => {}
      );

      setCameraReady(true);
      toast({ title: "Camera Ready", description: "Point at the book QR code to borrow" });
    } catch (error: any) {
      setCameraError(error.message || "Failed to start camera");
      setScanning(false);
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

  const borrowBook = async (qrPayload: any) => {
    if (!studentId) {
      toast({ title: "Error", description: "Student record not found", variant: "destructive" });
      return;
    }

    if (qrPayload.type !== "LIBRARY_BOOK") {
      toast({ title: "Error", description: "Invalid library QR code", variant: "destructive" });
      return;
    }

    // Check if already borrowed
    const { data: existing } = await supabase
      .from("book_borrowings")
      .select("id")
      .eq("student_id", studentId)
      .eq("book_id", qrPayload.bookId)
      .eq("status", "BORROWED")
      .maybeSingle();

    if (existing) {
      toast({ title: "Already Borrowed", description: "You already have this book borrowed", variant: "default" });
      return;
    }

    const { error } = await supabase
      .from("book_borrowings")
      .insert({
        book_id: qrPayload.bookId,
        student_id: studentId,
        issued_by: qrPayload.librarianId,
        status: "BORROWED",
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Book Borrowed!", description: `"${qrPayload.bookName}" - Due in 14 days` });
    fetchStudentBorrowings();
  };

  const handleReturnBook = async (borrowingId: string) => {
    const { error } = await supabase
      .from("book_borrowings")
      .update({ status: "RETURNED", returned_at: new Date().toISOString() })
      .eq("id", borrowingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Book Returned", description: "Thank you for returning the book" });
    if (role === "STUDENT") fetchStudentBorrowings();
    else fetchAllBorrowings();
  };

  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    return days;
  };

  if (loading || roleLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 sm:pb-0">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role || undefined} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Library Management
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {role === "LIBRARIAN" || role === "ADMIN" ? "Manage books and generate QR codes" : "Scan QR codes to borrow books"}
          </p>
        </div>

        {/* LIBRARIAN / ADMIN VIEW */}
        {(role === "LIBRARIAN" || role === "ADMIN") && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Books Management
                </CardTitle>
                <CardDescription>Add books and generate QR codes for students to borrow</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary mb-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Book
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Book</DialogTitle>
                      <DialogDescription>Enter book details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Book Name</Label>
                        <Input value={newBookName} onChange={(e) => setNewBookName(e.target.value)} placeholder="e.g., Data Structures" />
                      </div>
                      <div>
                        <Label>Book Code</Label>
                        <Input value={newBookCode} onChange={(e) => setNewBookCode(e.target.value)} placeholder="e.g., DS-001" />
                      </div>
                      <Button onClick={handleAddBook} className="w-full gradient-primary">Add Book</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {books.map((book) => (
                    <Card key={book.id} className="border-primary/20">
                      <CardContent className="pt-4">
                        <h3 className="font-semibold">{book.name}</h3>
                        <p className="text-sm text-muted-foreground">Code: {book.code}</p>
                        <Button onClick={() => generateBookQR(book)} size="sm" className="mt-3 w-full">
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate QR
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {qrData && selectedBook && (
                  <div className="mt-6 flex flex-col items-center p-6 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-2">{selectedBook.name}</h3>
                    <div className="p-4 bg-white rounded-lg">
                      <QRCodeSVG value={qrData} size={200} level="H" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Students can scan this to borrow</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active Borrowings</CardTitle>
                <CardDescription>Books currently borrowed by students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {borrowings.filter(b => b.status === "BORROWED").map((borrowing) => {
                    const daysRemaining = getDaysRemaining(borrowing.due_date);
                    return (
                      <div key={borrowing.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{borrowing.books?.name}</p>
                          <p className="text-sm text-muted-foreground">Due: {format(new Date(borrowing.due_date), "PPP")}</p>
                          <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining <= 3 ? "secondary" : "default"}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleReturnBook(borrowing.id)}>
                          Mark Returned
                        </Button>
                      </div>
                    );
                  })}
                  {borrowings.filter(b => b.status === "BORROWED").length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No active borrowings</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STUDENT VIEW */}
        {role === "STUDENT" && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scan Book QR Code
                </CardTitle>
                <CardDescription>Scan the QR code shown by librarian to borrow a book</CardDescription>
              </CardHeader>
              <CardContent>
                {cameraError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                )}

                {scanSuccess && (
                  <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">QR Code scanned successfully!</AlertDescription>
                  </Alert>
                )}

                <div id={QR_READER_ID} className={`w-full max-w-sm mx-auto rounded-lg overflow-hidden ${scanning ? 'min-h-[300px]' : 'hidden'}`} />

                {!scanning ? (
                  <Button onClick={startScanning} className="w-full gradient-primary" disabled={isProcessing}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera to Scan
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" className="w-full mt-4">
                    <CameraOff className="mr-2 h-4 w-4" />
                    Stop Camera
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  My Borrowed Books
                </CardTitle>
                <CardDescription>Track your borrowed books and due dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {borrowings.filter(b => b.status === "BORROWED").map((borrowing) => {
                    const daysRemaining = getDaysRemaining(borrowing.due_date);
                    return (
                      <div key={borrowing.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{borrowing.books?.name}</h4>
                            <p className="text-sm text-muted-foreground">Code: {borrowing.books?.code}</p>
                            <p className="text-sm text-muted-foreground">Borrowed: {format(new Date(borrowing.borrowed_at), "PPP")}</p>
                            <p className="text-sm">Due: {format(new Date(borrowing.due_date), "PPP")}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining <= 3 ? "secondary" : "default"} className="text-lg px-3 py-1">
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {borrowings.filter(b => b.status === "BORROWED").length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No books currently borrowed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
