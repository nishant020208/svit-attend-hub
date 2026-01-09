import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, QrCode, ScanLine, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface BorrowedBook {
  id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  status: string;
  books: {
    name: string;
    code: string;
  };
}

export default function BookReturn() {
  const [selectedBook, setSelectedBook] = useState<BorrowedBook | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const { toast } = useToast();
  const { role, isAdmin, userId, getEffectiveRole } = useUserRole();
  const queryClient = useQueryClient();
  
  const effectiveRole = getEffectiveRole();
  const isLibrarian = effectiveRole === "LIBRARIAN";
  const isStudent = effectiveRole === "STUDENT";
  const canScanReturns = isAdmin || isLibrarian;

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        setUserName(profile?.name || session.user.email || "");
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch student ID for current user
  const { data: studentData } = useQuery({
    queryKey: ["student-profile", userId],
    queryFn: async () => {
      if (!userId || !isStudent) return null;
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isStudent,
  });

  // Fetch borrowed books for student
  const { data: borrowedBooks, isLoading: booksLoading } = useQuery({
    queryKey: ["borrowed-books", studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return [];
      const { data, error } = await supabase
        .from("book_borrowings")
        .select(`
          id,
          book_id,
          borrowed_at,
          due_date,
          status,
          books (name, code)
        `)
        .eq("student_id", studentData.id)
        .eq("status", "BORROWED")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as BorrowedBook[];
    },
    enabled: !!studentData?.id,
  });

  // Scanner setup for admins/librarians
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning && canScanReturns) {
      scanner = new Html5QrcodeScanner(
        "qr-reader-return",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          try {
            const returnData = JSON.parse(decodedText);
            if (returnData.type === "book_return" && returnData.borrowing_id) {
              await processBookReturn(returnData.borrowing_id);
              scanner?.clear();
              setIsScanning(false);
            } else {
              toast({
                title: "Invalid QR Code",
                description: "This is not a valid book return QR code.",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Error",
              description: "Could not read QR code data.",
              variant: "destructive",
            });
          }
        },
        (error) => {
          console.log("QR scan error:", error);
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isScanning, canScanReturns]);

  const processBookReturn = async (borrowingId: string) => {
    setIsProcessing(true);
    try {
      // Get borrowing details
      const { data: borrowing, error: fetchError } = await supabase
        .from("book_borrowings")
        .select(`
          id,
          book_id,
          student_id,
          borrowed_at,
          due_date,
          status,
          books (name, code)
        `)
        .eq("id", borrowingId)
        .single();

      if (fetchError || !borrowing) {
        toast({
          title: "Error",
          description: "Could not find this borrowing record.",
          variant: "destructive",
        });
        return;
      }

      if (borrowing.status === "RETURNED") {
        toast({
          title: "Already Returned",
          description: "This book has already been returned.",
          variant: "default",
        });
        return;
      }

      // Calculate overdue fee (₹3 per day after 14 days)
      const dueDate = new Date(borrowing.due_date);
      const today = new Date();
      const daysOverdue = Math.max(0, differenceInDays(today, dueDate));
      const overdueFee = daysOverdue * 3;

      // Update the borrowing record
      const { error: updateError } = await supabase
        .from("book_borrowings")
        .update({
          status: "RETURNED",
          returned_at: new Date().toISOString(),
        })
        .eq("id", borrowingId);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to process book return.",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["borrowed-books"] });

      if (overdueFee > 0) {
        toast({
          title: "Book Returned - Overdue Fee",
          description: `Book returned successfully. Overdue fee: ₹${overdueFee} (${daysOverdue} days overdue)`,
          variant: "default",
        });
      } else {
        toast({
          title: "Book Returned",
          description: "Book has been returned successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReturnQR = (book: BorrowedBook) => {
    return JSON.stringify({
      type: "book_return",
      borrowing_id: book.id,
      book_code: book.books.code,
      book_name: book.books.name,
      timestamp: new Date().toISOString(),
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const calculateFee = (dueDate: string) => {
    const days = differenceInDays(new Date(), new Date(dueDate));
    return days > 0 ? days * 3 : 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={userEmail} userName={userName} userRole={effectiveRole || ""} />

      <main className="container mx-auto px-4 py-6 pb-20 sm:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Book Return</h1>
          <p className="text-muted-foreground">
            {isStudent ? "Generate QR code to return borrowed books" : "Scan student QR codes to process book returns"}
          </p>
        </div>

        {isStudent && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BookOpen className="h-5 w-5" />
                  Your Borrowed Books
                </CardTitle>
                <CardDescription>
                  Select a book to generate a return QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                {booksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : borrowedBooks && borrowedBooks.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {borrowedBooks.map((book) => (
                      <Card 
                        key={book.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedBook?.id === book.id ? "ring-2 ring-primary" : ""
                        } ${isOverdue(book.due_date) ? "border-destructive" : ""}`}
                        onClick={() => setSelectedBook(book)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{book.books.name}</h3>
                              <p className="text-sm text-muted-foreground">Code: {book.books.code}</p>
                              <p className="text-sm text-muted-foreground">
                                Borrowed: {format(new Date(book.borrowed_at), "MMM d, yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Due: {format(new Date(book.due_date), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isOverdue(book.due_date) ? (
                                <>
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Overdue
                                  </Badge>
                                  <span className="text-sm font-semibold text-destructive">
                                    Fee: ₹{calculateFee(book.due_date)}
                                  </span>
                                </>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  On Time
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You don't have any borrowed books</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedBook && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <QrCode className="h-5 w-5" />
                    Return QR Code
                  </CardTitle>
                  <CardDescription>
                    Show this QR code to the librarian to return "{selectedBook.books.name}"
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-lg shadow-inner">
                    <QRCodeSVG
                      value={generateReturnQR(selectedBook)}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground text-center">
                    Book: {selectedBook.books.name} ({selectedBook.books.code})
                  </p>
                  {isOverdue(selectedBook.due_date) && (
                    <p className="mt-2 text-sm font-semibold text-destructive">
                      Overdue Fee: ₹{calculateFee(selectedBook.due_date)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {canScanReturns && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ScanLine className="h-5 w-5" />
                Scan Book Return QR
              </CardTitle>
              <CardDescription>
                Scan a student's book return QR code to process the return
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isScanning ? (
                <div className="text-center py-8">
                  <Button
                    size="lg"
                    onClick={() => setIsScanning(true)}
                    className="gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ScanLine className="h-5 w-5" />
                    )}
                    Start Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div id="qr-reader-return" className="mx-auto max-w-md" />
                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setIsScanning(false)}
                    >
                      Stop Scanning
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
