-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'INTERNAL',
  course TEXT NOT NULL,
  section TEXT NOT NULL,
  year INTEGER NOT NULL,
  subject TEXT NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  passing_marks NUMERIC NOT NULL DEFAULT 35,
  exam_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results/marks table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  percentage NUMERIC,
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Create grade configuration table
CREATE TABLE public.grade_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  grade_points NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default GTU grade configuration
INSERT INTO public.grade_config (grade, min_percentage, max_percentage, grade_points, description) VALUES
  ('AA', 90, 100, 10, 'Outstanding'),
  ('AB', 80, 89.99, 9, 'Excellent'),
  ('BB', 70, 79.99, 8, 'Very Good'),
  ('BC', 60, 69.99, 7, 'Good'),
  ('CC', 50, 59.99, 6, 'Average'),
  ('CD', 45, 49.99, 5, 'Below Average'),
  ('DD', 40, 44.99, 4, 'Pass'),
  ('FF', 0, 39.99, 0, 'Fail');

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_config ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Everyone can view exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admin Faculty can manage exams" ON public.exams FOR ALL USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FACULTY')) WITH CHECK (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FACULTY'));

-- Results policies
CREATE POLICY "Students view own results" ON public.results FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Admin Faculty view all results" ON public.results FOR SELECT USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FACULTY'));
CREATE POLICY "Admin Faculty manage results" ON public.results FOR ALL USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FACULTY')) WITH CHECK (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FACULTY'));

-- Grade config policies
CREATE POLICY "Everyone can view grades" ON public.grade_config FOR SELECT USING (true);
CREATE POLICY "Admin can manage grades" ON public.grade_config FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Update timestamp trigger
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();