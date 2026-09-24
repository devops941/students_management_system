import api from '@/lib/api';

/** Loaders for dependent <Select> options inside CrudPage forms. */
export const loadDepartmentOptions = async () =>
  (await api.get('/departments', { limit: 100 })).items.map((d) => ({
    value: d.id,
    label: `${d.name} (${d.code})`,
  }));

export const loadCourseOptions = async () =>
  (await api.get('/courses', { limit: 100 })).items.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.code})`,
  }));

export const loadClassOptions = async () =>
  (await api.get('/classes', { limit: 100 })).items.map((c) => ({
    value: c.id,
    label: `${c.name}-${c.section} · Sem ${c.semester}`,
  }));

export const loadSubjectOptions = async () =>
  (await api.get('/subjects', { limit: 200 })).items.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.code})`,
  }));

export const loadFacultyOptions = async () =>
  (await api.get('/faculty-list', { limit: 200 })).items.map((f) => ({
    value: f.id,
    label: `${f.user.name} (${f.employeeCode})`,
  }));
