import CrudPage from '@/components/shared/CrudPage';
import { loadCourseOptions } from '@/lib/options';
import { Badge } from '@/components/ui/badge';

const fields = [
  { name: 'name', label: 'Class name', required: true, placeholder: 'CSE-3A' },
  { name: 'section', label: 'Section', required: true, placeholder: 'A' },
  { name: 'semester', label: 'Semester', type: 'number', required: true, default: 1 },
  { name: 'academicYear', label: 'Academic year', required: true, placeholder: '2025-2026', default: '2025-2026' },
  { name: 'courseId', label: 'Course', type: 'select', required: true, loadOptions: loadCourseOptions },
];

const columns = [
  { name: 'name', label: 'Class' },
  { name: 'section', label: 'Section', render: (r) => <Badge variant="outline">{r.section}</Badge> },
  { name: 'semester', label: 'Semester' },
  { name: 'academicYear', label: 'Academic year' },
  { name: 'course', label: 'Course', render: (r) => r.course?.name || '-' },
  { name: '_count', label: 'Students', render: (r) => r._count?.students ?? 0 },
];

export default function ClassesPage() {
  return (
    <CrudPage
      title="Classes"
      description="Class and section groupings that students and attendance belong to."
      endpoint="/classes"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search class, section or academic year..."
      transformSubmit={(v) => ({ ...v, semester: Number(v.semester) || 1 })}
    />
  );
}
