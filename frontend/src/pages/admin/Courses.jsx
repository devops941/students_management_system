import CrudPage from '@/components/shared/CrudPage';
import { loadDepartmentOptions } from '@/lib/options';

const fields = [
  { name: 'name', label: 'Course name', required: true, placeholder: 'B.Tech Computer Science' },
  { name: 'code', label: 'Course code', required: true, placeholder: 'BT-CSE' },
  { name: 'durationYears', label: 'Duration (years)', type: 'number', default: 4 },
  {
    name: 'departmentId',
    label: 'Department',
    type: 'select',
    required: true,
    loadOptions: loadDepartmentOptions,
  },
];

const columns = [
  { name: 'name', label: 'Course' },
  { name: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
  { name: 'department', label: 'Department', render: (r) => r.department?.name || '-' },
  { name: 'durationYears', label: 'Years' },
  { name: '_count', label: 'Classes / Subjects', render: (r) => `${r._count?.classes ?? 0} / ${r._count?.subjects ?? 0}` },
];

export default function CoursesPage() {
  return (
    <CrudPage
      title="Courses"
      description="Degree programmes offered under each department."
      endpoint="/courses"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search course by name or code..."
      transformSubmit={(v) => ({ ...v, durationYears: Number(v.durationYears) || 4 })}
    />
  );
}
