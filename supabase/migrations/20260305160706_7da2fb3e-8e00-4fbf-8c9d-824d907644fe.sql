
-- Classes table (top level)
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage classes" ON public.classes FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role)) WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Everyone view classes" ON public.classes FOR SELECT USING (true);

-- Batches table (child of classes)
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage batches" ON public.batches FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role)) WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Everyone view batches" ON public.batches FOR SELECT USING (true);

-- Academic sections table (child of batches)
CREATE TABLE public.academic_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage academic_sections" ON public.academic_sections FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role)) WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Everyone view academic_sections" ON public.academic_sections FOR SELECT USING (true);

-- Subsections table (child of academic_sections, optional)
CREATE TABLE public.subsections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage subsections" ON public.subsections FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role)) WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Everyone view subsections" ON public.subsections FOR SELECT USING (true);

-- Student assignments table
CREATE TABLE public.student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE UNIQUE,
  class_id uuid NOT NULL REFERENCES public.classes(id),
  batch_id uuid NOT NULL REFERENCES public.batches(id),
  section_id uuid NOT NULL REFERENCES public.academic_sections(id),
  subsection_id uuid REFERENCES public.subsections(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage student_assignments" ON public.student_assignments FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role)) WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Students view own assignment" ON public.student_assignments FOR SELECT USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Faculty view assignments" ON public.student_assignments FOR SELECT USING (has_role(auth.uid(), 'FACULTY'::app_role));

-- Add attachment_url to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add target columns to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'all';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_class_id uuid REFERENCES public.classes(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_batch_id uuid REFERENCES public.batches(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_section_id uuid REFERENCES public.academic_sections(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_subsection_id uuid REFERENCES public.subsections(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_student_id uuid REFERENCES public.students(id);

-- Create leave-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('leave-attachments', 'leave-attachments', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for leave-attachments
CREATE POLICY "Students upload leave attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users view leave attachments" ON storage.objects FOR SELECT USING (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');
