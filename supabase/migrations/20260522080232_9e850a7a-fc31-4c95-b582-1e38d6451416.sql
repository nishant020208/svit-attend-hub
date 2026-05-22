
-- Restrict publicly-readable academic/reference tables to authenticated users only
DROP POLICY IF EXISTS "Everyone view announcements" ON public.announcements;
CREATE POLICY "Authenticated view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view books" ON public.books;
CREATE POLICY "Authenticated view books" ON public.books
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view courses" ON public.courses;
CREATE POLICY "Authenticated view courses" ON public.courses
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view sections" ON public.sections;
CREATE POLICY "Authenticated view sections" ON public.sections
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view subjects" ON public.subjects;
CREATE POLICY "Authenticated view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone view subsections" ON public.subsections;
CREATE POLICY "Authenticated view subsections" ON public.subsections
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone view academic_sections" ON public.academic_sections;
CREATE POLICY "Authenticated view academic_sections" ON public.academic_sections
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone view batches" ON public.batches;
CREATE POLICY "Authenticated view batches" ON public.batches
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone view classes" ON public.classes;
CREATE POLICY "Authenticated view classes" ON public.classes
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view grades" ON public.grade_config;
CREATE POLICY "Authenticated view grades" ON public.grade_config
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view exams" ON public.exams;
CREATE POLICY "Authenticated view exams" ON public.exams
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone view timetable" ON public.timetable;
CREATE POLICY "Authenticated view timetable" ON public.timetable
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Strengthen profiles: parents may view their children's profile; explicit anon deny remains
CREATE POLICY "Parents view children profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT s.user_id FROM public.students s
      JOIN public.parent_student_relation psr ON psr.student_id = s.id
      WHERE psr.parent_id = auth.uid()
    )
  );
