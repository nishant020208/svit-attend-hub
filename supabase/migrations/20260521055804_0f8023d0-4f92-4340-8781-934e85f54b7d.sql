
-- Enum for risk levels
CREATE TYPE public.risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 1. risk_scores (current snapshot per student)
CREATE TABLE public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE,
  score NUMERIC NOT NULL DEFAULT 0,
  level public.risk_level NOT NULL DEFAULT 'LOW',
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_scores_level ON public.risk_scores(level);
CREATE INDEX idx_risk_scores_student ON public.risk_scores(student_id);

-- 2. risk_factors_history (time series)
CREATE TABLE public.risk_factors_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  score NUMERIC NOT NULL,
  level public.risk_level NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfh_student_date ON public.risk_factors_history(student_id, snapshot_date DESC);

-- 3. interventions
CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  faculty_id UUID NOT NULL,
  intervention_type TEXT NOT NULL,
  notes TEXT,
  action_taken TEXT,
  follow_up_date DATE,
  student_response TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interventions_student ON public.interventions(student_id);
CREATE INDEX idx_interventions_faculty ON public.interventions(faculty_id);

-- 4. intervention_outcomes
CREATE TABLE public.intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL,
  before_attendance NUMERIC,
  after_attendance NUMERIC,
  before_avg_marks NUMERIC,
  after_avg_marks NUMERIC,
  risk_score_delta NUMERIC,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outcomes_intervention ON public.intervention_outcomes(intervention_id);

-- 5. risk_alerts
CREATE TABLE public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity public.risk_level NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggered_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_student ON public.risk_alerts(student_id);
CREATE INDEX idx_alerts_created ON public.risk_alerts(created_at DESC);

-- 6. mentor_assignments
CREATE TABLE public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE (faculty_id, student_id)
);
CREATE INDEX idx_mentor_faculty ON public.mentor_assignments(faculty_id);
CREATE INDEX idx_mentor_student ON public.mentor_assignments(student_id);

-- 7. subject_performance_snapshots
CREATE TABLE public.subject_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  avg_marks NUMERIC,
  completion_rate NUMERIC,
  trend TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sps_student_subject ON public.subject_performance_snapshots(student_id, subject);

-- Enable RLS on all
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_factors_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Deny anon everywhere
CREATE POLICY "Deny anon risk_scores" ON public.risk_scores AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon risk_factors_history" ON public.risk_factors_history AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon interventions" ON public.interventions AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon intervention_outcomes" ON public.intervention_outcomes AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon risk_alerts" ON public.risk_alerts AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon mentor_assignments" ON public.mentor_assignments AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon subject_performance_snapshots" ON public.subject_performance_snapshots AS RESTRICTIVE FOR ALL TO anon USING (false);

-- risk_scores policies
CREATE POLICY "Admin Faculty view risk_scores" ON public.risk_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own risk_score" ON public.risk_scores FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Parent view children risk_score" ON public.risk_scores FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_student_relation WHERE parent_id = auth.uid()));
CREATE POLICY "Admin Faculty manage risk_scores" ON public.risk_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));

-- risk_factors_history
CREATE POLICY "Admin Faculty view rfh" ON public.risk_factors_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own rfh" ON public.risk_factors_history FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Parent view children rfh" ON public.risk_factors_history FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_student_relation WHERE parent_id = auth.uid()));
CREATE POLICY "Admin Faculty insert rfh" ON public.risk_factors_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));

-- interventions
CREATE POLICY "Admin Faculty view interventions" ON public.interventions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own interventions" ON public.interventions FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Parent view children interventions" ON public.interventions FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_student_relation WHERE parent_id = auth.uid()));
CREATE POLICY "Faculty create interventions" ON public.interventions FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role)) AND faculty_id = auth.uid());
CREATE POLICY "Faculty update own interventions" ON public.interventions FOR UPDATE TO authenticated
  USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Admin delete interventions" ON public.interventions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- intervention_outcomes
CREATE POLICY "Admin Faculty view outcomes" ON public.intervention_outcomes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own outcomes" ON public.intervention_outcomes FOR SELECT TO authenticated
  USING (intervention_id IN (SELECT i.id FROM public.interventions i JOIN public.students s ON s.id = i.student_id WHERE s.user_id = auth.uid()));
CREATE POLICY "Admin Faculty manage outcomes" ON public.intervention_outcomes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));

-- risk_alerts
CREATE POLICY "Admin Faculty view alerts" ON public.risk_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own alerts" ON public.risk_alerts FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Parent view children alerts" ON public.risk_alerts FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_student_relation WHERE parent_id = auth.uid()));
CREATE POLICY "Admin Faculty insert alerts" ON public.risk_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Admin Faculty update alerts" ON public.risk_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));

-- mentor_assignments
CREATE POLICY "Admin manage mentor_assignments" ON public.mentor_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Faculty view own mentees" ON public.mentor_assignments FOR SELECT TO authenticated
  USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Student view own mentor" ON public.mentor_assignments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- subject_performance_snapshots
CREATE POLICY "Admin Faculty view sps" ON public.subject_performance_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));
CREATE POLICY "Student view own sps" ON public.subject_performance_snapshots FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "Parent view children sps" ON public.subject_performance_snapshots FOR SELECT TO authenticated
  USING (student_id IN (SELECT student_id FROM public.parent_student_relation WHERE parent_id = auth.uid()));
CREATE POLICY "Admin Faculty manage sps" ON public.subject_performance_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role) OR public.has_role(auth.uid(), 'FACULTY'::app_role));

-- Triggers for updated_at
CREATE TRIGGER interventions_updated_at BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
