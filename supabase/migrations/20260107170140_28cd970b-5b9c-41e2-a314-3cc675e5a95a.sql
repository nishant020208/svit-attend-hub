-- Create books table for library management
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- RLS policies for books
CREATE POLICY "Everyone can view books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Librarian can manage books"
ON public.books FOR ALL
USING (has_role(auth.uid(), 'LIBRARIAN'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (has_role(auth.uid(), 'LIBRARIAN'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

-- Create book_borrowings table to track borrowed books
CREATE TABLE public.book_borrowings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  borrowed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  returned_at TIMESTAMP WITH TIME ZONE,
  issued_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'BORROWED'
);

-- Enable RLS on book_borrowings
ALTER TABLE public.book_borrowings ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_borrowings
CREATE POLICY "Students can view their own borrowings"
ON public.book_borrowings FOR SELECT
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Librarian can view all borrowings"
ON public.book_borrowings FOR SELECT
USING (has_role(auth.uid(), 'LIBRARIAN'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Students can borrow books via QR"
ON public.book_borrowings FOR INSERT
WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid()) 
  AND (has_role(issued_by, 'LIBRARIAN'::app_role) OR has_role(issued_by, 'ADMIN'::app_role))
);

CREATE POLICY "Librarian can manage borrowings"
ON public.book_borrowings FOR ALL
USING (has_role(auth.uid(), 'LIBRARIAN'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (has_role(auth.uid(), 'LIBRARIAN'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

-- Update trigger for books
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();