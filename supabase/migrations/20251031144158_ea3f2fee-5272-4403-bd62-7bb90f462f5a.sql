-- Add PARENT to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'PARENT';

-- Extend profiles table with more fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Update profiles to split existing name into first_name and last_name
UPDATE public.profiles 
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
      WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
      THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      ELSE ''
    END
WHERE first_name IS NULL;

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  teacher_id UUID REFERENCES public.profiles(id),
  teacher_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_requests
CREATE POLICY "Students can view their own leave requests"
  ON public.leave_requests FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can create leave requests"
  ON public.leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers and Admins can view all leave requests"
  ON public.leave_requests FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

CREATE POLICY "Teachers can update leave requests"
  ON public.leave_requests FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('ADMIN', 'FACULTY'));

-- Add trigger for leave_requests updated_at
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create parent_student_relation table
CREATE TABLE IF NOT EXISTS public.parent_student_relation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'PARENT' CHECK (relation_type IN ('PARENT', 'GUARDIAN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS on parent_student_relation
ALTER TABLE public.parent_student_relation ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_student_relation
CREATE POLICY "Parents can view their relations"
  ON public.parent_student_relation FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage parent relations"
  ON public.parent_student_relation FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN')
  WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_student_id ON public.leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student_relation(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student_relation(student_id);