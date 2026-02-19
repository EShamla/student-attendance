export type UserRole = 'student' | 'lecturer' | 'secretariat';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type AttendanceStatus = 'present' | 'late';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole | null;
  status: UserStatus;
  student_id: string | null;
  created_at: string;
}

export interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  semester_id: string;
  name: string;
  code: string;
  lecturer_id: string | null;
  max_students: number;
  created_at: string;
  // Joined fields
  semesters?: Semester;
  profiles?: Profile;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  // Joined fields
  courses?: Course;
  profiles?: Profile;
}

export interface Lesson {
  id: string;
  course_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  // Joined fields
  courses?: Course;
}

export interface Attendance {
  id: string;
  lesson_id: string;
  student_id: string;
  checked_in_at: string;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  status: AttendanceStatus;
  // Joined fields
  lessons?: Lesson;
  profiles?: Profile;
}
