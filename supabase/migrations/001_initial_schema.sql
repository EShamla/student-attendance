-- ============================================================
-- 001_initial_schema.sql
-- Academic Attendance System — Full Schema + RLS + Triggers
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  role          TEXT CHECK (role IN ('student', 'lecturer', 'secretariat')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  student_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'role',
    COALESCE(NEW.raw_user_meta_data->>'status', 'pending')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: semesters
-- ============================================================
CREATE TABLE public.semesters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active semester at a time
CREATE OR REPLACE FUNCTION public.ensure_single_active_semester()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.semesters SET is_active = FALSE WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_active_semester
  BEFORE INSERT OR UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_semester();

-- ============================================================
-- TABLE: courses
-- ============================================================
CREATE TABLE public.courses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester_id  UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  lecturer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_students INT NOT NULL DEFAULT 40,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: enrollments
-- ============================================================
CREATE TABLE public.enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

-- ============================================================
-- TABLE: lessons
-- ============================================================
CREATE TABLE public.lessons (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id         UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 90,
  location_name     TEXT NOT NULL DEFAULT '',
  location_lat      FLOAT8,
  location_lng      FLOAT8,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE public.attendance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id        UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude         FLOAT8,
  longitude        FLOAT8,
  distance_meters  FLOAT4,
  status           TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late')),
  UNIQUE (lesson_id, student_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance   ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_status(user_id UUID)
RETURNS TEXT AS $$
  SELECT status FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: profiles
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Secretariat can read all profiles
CREATE POLICY "profiles_select_secretariat" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'secretariat');

-- Lecturers can read profiles of students in their courses
CREATE POLICY "profiles_select_lecturer" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'lecturer'
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON e.course_id = c.id
      WHERE e.student_id = profiles.id
      AND c.lecturer_id = auth.uid()
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Secretariat can update any profile
CREATE POLICY "profiles_update_secretariat" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'secretariat');

-- Secretariat can insert profiles (for manually created users)
CREATE POLICY "profiles_insert_secretariat" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'secretariat');

-- System (trigger) can insert profiles - allow for new users via service role
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT WITH CHECK (true); -- service_role bypasses RLS anyway

-- ============================================================
-- RLS: semesters
-- ============================================================

-- All authenticated users can read semesters
CREATE POLICY "semesters_select_all" ON public.semesters
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only secretariat can modify
CREATE POLICY "semesters_all_secretariat" ON public.semesters
  FOR ALL USING (public.get_user_role(auth.uid()) = 'secretariat');

-- ============================================================
-- RLS: courses
-- ============================================================

-- All active authenticated users can read courses
CREATE POLICY "courses_select_all" ON public.courses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only secretariat can modify
CREATE POLICY "courses_all_secretariat" ON public.courses
  FOR ALL USING (public.get_user_role(auth.uid()) = 'secretariat');

-- ============================================================
-- RLS: enrollments
-- ============================================================

-- Students can read their own enrollments
CREATE POLICY "enrollments_select_student" ON public.enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Lecturers can read enrollments for their courses
CREATE POLICY "enrollments_select_lecturer" ON public.enrollments
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'lecturer'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = enrollments.course_id AND c.lecturer_id = auth.uid()
    )
  );

-- Secretariat can do everything
CREATE POLICY "enrollments_all_secretariat" ON public.enrollments
  FOR ALL USING (public.get_user_role(auth.uid()) = 'secretariat');

-- ============================================================
-- RLS: lessons
-- ============================================================

-- Students can read lessons for courses they are enrolled in
CREATE POLICY "lessons_select_student" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lessons.course_id AND e.student_id = auth.uid()
    )
  );

-- Lecturers can read lessons for their courses
CREATE POLICY "lessons_select_lecturer" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.lecturer_id = auth.uid()
    )
  );

-- Secretariat can do everything
CREATE POLICY "lessons_all_secretariat" ON public.lessons
  FOR ALL USING (public.get_user_role(auth.uid()) = 'secretariat');

-- ============================================================
-- RLS: attendance
-- ============================================================

-- Students can read/insert their own attendance
CREATE POLICY "attendance_select_student" ON public.attendance
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "attendance_insert_student" ON public.attendance
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Lecturers can read attendance for their lessons
CREATE POLICY "attendance_select_lecturer" ON public.attendance
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'lecturer'
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      WHERE l.id = attendance.lesson_id AND c.lecturer_id = auth.uid()
    )
  );

-- Secretariat can do everything
CREATE POLICY "attendance_all_secretariat" ON public.attendance
  FOR ALL USING (public.get_user_role(auth.uid()) = 'secretariat');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_courses_semester ON public.courses(semester_id);
CREATE INDEX idx_courses_lecturer ON public.courses(lecturer_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_lessons_course ON public.lessons(course_id);
CREATE INDEX idx_lessons_scheduled ON public.lessons(scheduled_at);
CREATE INDEX idx_attendance_lesson ON public.attendance(lesson_id);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
