import CrudPage from '@/components/shared/CrudPage';
import { loadCourseOptions, loadFacultyOptions } from '@/lib/options';

const fields = [
  { name: 'name', label: 'Subject name', required: true, placeholder: 'Database Management Systems' },
  { name: 'code', label: 'Subject code', required: true, placeholder: 'CS501' },
  { name: 'semester', label: 'Semester', type: 'number', required: true, default: 1 },
  { name: 'credits', label: 'Credits', type: 'number', default: 3 },
  { name: 'courseId', label: 'Course', type: 'select', required: true, loadOptions: loadCourseOptions },
  {
    name: 'facultyId',
    label: 'Assigned faculty',
    type: 'select',
    loadOptions: loadFacultyOptions,
    hint: 'Used to scope the faculty dashboard, marking and leave approvals.',
  },
];

const columns = [
  { name: 'name', label: 'Subject' },
  { name: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
  { name: 'semester', label: 'Semester' },
  { name: 'credits', label: 'Credits' },
  { name: 'course', label: 'Course', render: (r) => r.course?.name || '-' },
  { name: 'faculty', label: 'Faculty', render: (r) => r.faculty?.user?.name || 'Unassigned' },
];

export default function SubjectsPage() {
  return (
    <CrudPage
      title="Subjects"
      description="Subjects taught in each course, with their assigned faculty."
      endpoint="/subjects"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search subject by name or code..."
      transformSubmit={(v) => ({ ...v, semester: Number(v.semester) || 1, credits: Number(v.credits) || 3 })}
    />
  );
}
