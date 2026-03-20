
-- Add total_copies column to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_copies integer NOT NULL DEFAULT 1;

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ai_category text,
  ai_priority text,
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Students can create feedback
CREATE POLICY "Users create own feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view own feedback
CREATE POLICY "Users view own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/Faculty can view all feedback
CREATE POLICY "Admin Faculty view all feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role));

-- Admin can update feedback (respond)
CREATE POLICY "Admin update feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can delete feedback
CREATE POLICY "Admin delete feedback" ON public.feedback
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Create parent_alerts table for tracking sent alerts
CREATE TABLE public.parent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view own alerts" ON public.parent_alerts
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "System insert alerts" ON public.parent_alerts
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'FACULTY'::app_role));

CREATE POLICY "Admin view all alerts" ON public.parent_alerts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role));
