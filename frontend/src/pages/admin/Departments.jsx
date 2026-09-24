import CrudPage from '@/components/shared/CrudPage';

const fields = [
  { name: 'name', label: 'Department name', required: true, placeholder: 'Computer Science & Engineering' },
  { name: 'code', label: 'Code', required: true, placeholder: 'CSE' },
  { name: 'hodName', label: 'Head of department', placeholder: 'Dr. R. Krishnan' },
];

const columns = [
  { name: 'name', label: 'Department' },
  { name: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
  { name: 'hodName', label: 'HOD' },
  { name: '_count', label: 'Courses', render: (r) => r._count?.courses ?? 0 },
];

export default function DepartmentsPage() {
  return (
    <CrudPage
      title="Departments"
      description="Academic departments that own courses, faculty and students."
      endpoint="/departments"
      fields={fields}
      columns={columns}
      searchPlaceholder="Search by name, code or HOD..."
      emptyTitle="No departments configured"
      emptyDescription="Start by adding the departments of your institution."
    />
  );
}
