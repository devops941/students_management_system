export const ROLES = {
  ADMIN: 'ADMIN',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
};

/**
 * Single source of truth for navigation. Each entry lists the roles allowed
 * to see it; the sidebar and route guards both read from here.
 */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: 'LayoutDashboard', roles: ['ADMIN'] },
      { label: 'Dashboard', to: '/faculty/dashboard', icon: 'LayoutDashboard', roles: ['FACULTY'] },
      { label: 'My Attendance', to: '/student/attendance', icon: 'CalendarCheck', roles: ['STUDENT'] },
      { label: 'Ward Attendance', to: '/parent/dashboard', icon: 'Users', roles: ['PARENT'] },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Departments', to: '/admin/departments', icon: 'Building2', roles: ['ADMIN'] },
      { label: 'Courses', to: '/admin/courses', icon: 'GraduationCap', roles: ['ADMIN'] },
      { label: 'Classes', to: '/admin/classes', icon: 'School', roles: ['ADMIN'] },
      { label: 'Subjects', to: '/admin/subjects', icon: 'BookOpen', roles: ['ADMIN'] },
      { label: 'Timetable', to: '/admin/timetable', icon: 'CalendarDays', roles: ['ADMIN'] },
      { label: 'My Timetable', to: '/faculty/timetable', icon: 'CalendarDays', roles: ['FACULTY'] },
      { label: 'My Timetable', to: '/student/timetable', icon: 'CalendarDays', roles: ['STUDENT'] },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students', to: '/admin/students', icon: 'Users', roles: ['ADMIN'] },
      { label: 'Faculty', to: '/admin/faculty', icon: 'UserCog', roles: ['ADMIN'] },
      { label: 'User Accounts', to: '/admin/users', icon: 'KeyRound', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Mark Attendance', to: '/faculty/mark-attendance', icon: 'ClipboardCheck', roles: ['FACULTY'] },
      { label: 'Attendance Records', to: '/admin/attendance', icon: 'ClipboardList', roles: ['ADMIN'] },
      { label: 'My Classes', to: '/faculty/classes', icon: 'School', roles: ['FACULTY'] },
      { label: 'Apply Leave', to: '/student/leaves', icon: 'FileText', roles: ['STUDENT'] },
      { label: 'Leave Requests', to: '/faculty/leaves', icon: 'FileText', roles: ['FACULTY'] },
      { label: 'Leave Requests', to: '/admin/leaves', icon: 'FileText', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Alerts', to: '/admin/alerts', icon: 'Bell', roles: ['ADMIN'] },
      { label: 'Defaulters', to: '/admin/defaulters', icon: 'UserX', roles: ['ADMIN'] },
      { label: 'Defaulters', to: '/faculty/defaulters', icon: 'UserX', roles: ['FACULTY'] },
      { label: 'Reports', to: '/admin/reports', icon: 'BarChart3', roles: ['ADMIN'] },
      { label: 'Reports', to: '/faculty/reports', icon: 'BarChart3', roles: ['FACULTY'] },
      { label: 'Alerts', to: '/student/alerts', icon: 'Bell', roles: ['STUDENT', 'PARENT'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', to: '/admin/settings', icon: 'Settings', roles: ['ADMIN'] },
      { label: 'Audit Log', to: '/admin/audit', icon: 'ScrollText', roles: ['ADMIN'] },
      { label: 'Profile', to: '/profile', icon: 'UserCircle', roles: ['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'] },
    ],
  },
];

export const HOME_BY_ROLE = {
  ADMIN: '/admin/dashboard',
  FACULTY: '/faculty/dashboard',
  STUDENT: '/student/attendance',
  PARENT: '/parent/dashboard',
};
