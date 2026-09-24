import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { RequireAuth, RedirectHome } from '@/routes/guards';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProfilePage from '@/pages/ProfilePage';

/* Admin */
import AdminDashboard from '@/pages/admin/Dashboard';
import DepartmentsPage from '@/pages/admin/Departments';
import CoursesPage from '@/pages/admin/Courses';
import ClassesPage from '@/pages/admin/Classes';
import SubjectsPage from '@/pages/admin/Subjects';
import TimetablePage from '@/pages/admin/Timetable';
import StudentsPage from '@/pages/admin/Students';
import FacultyPage from '@/pages/admin/Faculty';
import UsersPage from '@/pages/admin/Users';
import AttendanceRecordsPage from '@/pages/admin/AttendanceRecords';
import LeavesPage from '@/pages/admin/Leaves';
import AlertsPage from '@/pages/admin/Alerts';
import DefaultersPage from '@/pages/admin/Defaulters';
import ReportsPage from '@/pages/admin/Reports';
import SettingsPage from '@/pages/admin/Settings';
import AuditLogPage from '@/pages/admin/AuditLog';

/* Faculty */
import FacultyDashboard from '@/pages/faculty/Dashboard';
import MarkAttendancePage from '@/pages/faculty/MarkAttendance';
import FacultyClassesPage from '@/pages/faculty/Classes';
import FacultyTimetablePage from '@/pages/faculty/Timetable';
import FacultyLeavesPage from '@/pages/faculty/Leaves';
import FacultyReportsPage from '@/pages/faculty/Reports';

/* Student */
import StudentAttendancePage from '@/pages/student/Attendance';
import StudentTimetablePage from '@/pages/student/Timetable';
import StudentLeavesPage from '@/pages/student/Leaves';
import StudentAlertsPage from '@/pages/student/Alerts';

/* Parent */
import ParentDashboard from '@/pages/parent/Dashboard';

const ALL = ['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RedirectHome />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/profile" element={<ProfilePage />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<RequireAuth roles={['ADMIN']}><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/departments" element={<RequireAuth roles={['ADMIN']}><DepartmentsPage /></RequireAuth>} />
        <Route path="/admin/courses" element={<RequireAuth roles={['ADMIN']}><CoursesPage /></RequireAuth>} />
        <Route path="/admin/classes" element={<RequireAuth roles={['ADMIN']}><ClassesPage /></RequireAuth>} />
        <Route path="/admin/subjects" element={<RequireAuth roles={['ADMIN']}><SubjectsPage /></RequireAuth>} />
        <Route path="/admin/timetable" element={<RequireAuth roles={['ADMIN']}><TimetablePage /></RequireAuth>} />
        <Route path="/admin/students" element={<RequireAuth roles={['ADMIN']}><StudentsPage /></RequireAuth>} />
        <Route path="/admin/faculty" element={<RequireAuth roles={['ADMIN']}><FacultyPage /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth roles={['ADMIN']}><UsersPage /></RequireAuth>} />
        <Route path="/admin/attendance" element={<RequireAuth roles={['ADMIN']}><AttendanceRecordsPage /></RequireAuth>} />
        <Route path="/admin/leaves" element={<RequireAuth roles={['ADMIN']}><LeavesPage /></RequireAuth>} />
        <Route path="/admin/alerts" element={<RequireAuth roles={['ADMIN']}><AlertsPage /></RequireAuth>} />
        <Route path="/admin/defaulters" element={<RequireAuth roles={['ADMIN']}><DefaultersPage /></RequireAuth>} />
        <Route path="/admin/reports" element={<RequireAuth roles={['ADMIN']}><ReportsPage /></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth roles={['ADMIN']}><SettingsPage /></RequireAuth>} />
        <Route path="/admin/audit" element={<RequireAuth roles={['ADMIN']}><AuditLogPage /></RequireAuth>} />

        {/* Faculty */}
        <Route path="/faculty/dashboard" element={<RequireAuth roles={['FACULTY']}><FacultyDashboard /></RequireAuth>} />
        <Route path="/faculty/mark-attendance" element={<RequireAuth roles={['FACULTY']}><MarkAttendancePage /></RequireAuth>} />
        <Route path="/faculty/classes" element={<RequireAuth roles={['FACULTY']}><FacultyClassesPage /></RequireAuth>} />
        <Route path="/faculty/timetable" element={<RequireAuth roles={['FACULTY']}><FacultyTimetablePage /></RequireAuth>} />
        <Route path="/faculty/leaves" element={<RequireAuth roles={['FACULTY']}><FacultyLeavesPage /></RequireAuth>} />
        <Route path="/faculty/reports" element={<RequireAuth roles={['FACULTY']}><FacultyReportsPage /></RequireAuth>} />
        <Route path="/faculty/defaulters" element={<RequireAuth roles={['FACULTY']}><DefaultersPage /></RequireAuth>} />

        {/* Student */}
        <Route path="/student/attendance" element={<RequireAuth roles={['STUDENT']}><StudentAttendancePage /></RequireAuth>} />
        <Route path="/student/timetable" element={<RequireAuth roles={['STUDENT']}><StudentTimetablePage /></RequireAuth>} />
        <Route path="/student/leaves" element={<RequireAuth roles={['STUDENT']}><StudentLeavesPage /></RequireAuth>} />
        <Route path="/student/alerts" element={<RequireAuth roles={ALL}><StudentAlertsPage /></RequireAuth>} />

        {/* Parent */}
        <Route path="/parent/dashboard" element={<RequireAuth roles={['PARENT']}><ParentDashboard /></RequireAuth>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
