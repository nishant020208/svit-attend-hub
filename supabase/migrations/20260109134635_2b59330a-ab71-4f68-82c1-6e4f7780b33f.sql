-- Create homework table
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  course TEXT NOT NULL,
  section TEXT NOT NULL,
  year INTEGER NOT NULL,
  homework_type TEXT NOT NULL DEFAULT 'assignment',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework submissions table
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted',
  grade TEXT,
  teacher_remarks TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add leave_type column to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'regular';

-- Add attendance_credit column to leave_requests (percentage of attendance to be credited)
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS attendance_credit NUMERIC DEFAULT 0;

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- Homework policies
CREATE POLICY "Faculty can manage homework" ON public.homework
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role));

CREATE POLICY "Students view homework for their class" ON public.homework
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s 
      WHERE s.user_id = auth.uid() 
      AND s.course = homework.course 
      AND s.section = homework.section 
      AND s.year = homework.year
    )
  );

CREATE POLICY "Parents view children homework" ON public.homework
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relation psr
      JOIN students s ON s.id = psr.student_id
      WHERE psr.parent_id = auth.uid()
      AND s.course = homework.course 
      AND s.section = homework.section 
      AND s.year = homework.year
    )
  );

-- Homework submissions policies
CREATE POLICY "Students can submit homework" ON public.homework_submissions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students view own submissions" ON public.homework_submissions
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can update own submissions" ON public.homework_submissions
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Faculty can view all submissions" ON public.homework_submissions
  FOR SELECT USING (
    has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role)
  );

CREATE POLICY "Faculty can update submissions" ON public.homework_submissions
  FOR UPDATE USING (
    has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role)
  );

-- Create storage bucket for homework files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('homework', 'homework', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for homework bucket
CREATE POLICY "Students can upload homework files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'homework' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view homework files" ON storage.objects
  FOR SELECT USING (bucket_id = 'homework');

CREATE POLICY "Users can update own homework files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'homework' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create unique constraint on homework submissions
CREATE UNIQUE INDEX IF NOT EXISTS homework_submissions_homework_student_unique 
  ON public.homework_submissions(homework_id, student_id);