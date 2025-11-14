-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view subjects"
ON public.subjects
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage subjects"
ON public.subjects
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));