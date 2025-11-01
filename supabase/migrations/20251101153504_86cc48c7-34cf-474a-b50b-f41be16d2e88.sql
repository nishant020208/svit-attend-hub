-- Create storage bucket for announcements
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true);

-- Create storage policies for announcements
CREATE POLICY "Anyone can view announcement files"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Admin and Faculty can upload announcement files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcements' AND
  get_user_role(auth.uid()) = ANY (ARRAY['ADMIN'::app_role, 'FACULTY'::app_role])
);

CREATE POLICY "Admin and Faculty can update announcement files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'announcements' AND
  get_user_role(auth.uid()) = ANY (ARRAY['ADMIN'::app_role, 'FACULTY'::app_role])
);

CREATE POLICY "Admin and Faculty can delete announcement files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcements' AND
  get_user_role(auth.uid()) = ANY (ARRAY['ADMIN'::app_role, 'FACULTY'::app_role])
);

-- Create courses table
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view courses"
ON public.courses FOR SELECT
USING (true);

CREATE POLICY "Admin can manage courses"
ON public.courses FOR ALL
USING (get_user_role(auth.uid()) = 'ADMIN'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'ADMIN'::app_role);

-- Create sections table
CREATE TABLE public.sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  year integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, course_id, year)
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view sections"
ON public.sections FOR SELECT
USING (true);

CREATE POLICY "Admin can manage sections"
ON public.sections FOR ALL
USING (get_user_role(auth.uid()) = 'ADMIN'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'ADMIN'::app_role);

-- Add trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add trigger for updated_at on sections
CREATE TRIGGER update_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();