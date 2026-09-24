import { useEffect, useState } from 'react';
import { Plus, Search, Upload, Pencil, Trash2, Eye, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination, AttendanceProgress, StatCard } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, AlertTriangle } from 'lucide-react';
import { loadClassOptions, loadDepartmentOptions } from '@/lib/options';

const emptyForm = {
  name: '', email: '', rollNumber: '', phone: '', guardianName: '', guardianPhone: '',
  classId: '', departmentId: '', admissionYear: String(new Date().getFullYear()),
};

export default function StudentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importText, setImportText] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([loadClassOptions(), loadDepartmentOptions()])
      .then(([c, d]) => {
        setClassOptions(c);
        setDeptOptions(d);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/students', {
        page, limit: meta.limit, q: query || undefined, classId: classFilter || undefined,
      });
      setItems(data.items);
      setMeta({ page: data.page, pages: data.pages || 1, total: data.total, limit: data.limit });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, classFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.user?.name || '',
      email: row.user?.email || '',
      rollNumber: row.rollNumber || '',
      phone: row.user?.phone || '',
      guardianName: row.guardianName || '',
      guardianPhone: row.guardianPhone || '',
      classId: row.class?.id || '',
      departmentId: row.department?.id || '',
      admissionYear: String(row.admissionYear || ''),
    });
    setDialogOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.rollNumber || !form.classId || !form.departmentId) {
      toast.error('Name, email, roll number, class and department are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, admissionYear: Number(form.admissionYear) || new Date().getFullYear() };
      if (editing) {
        await api.put(`/students/${editing.id}`, payload);
        toast.success('Student updated');
      } else {
        await api.post('/students', payload);
        toast.success('Student created. Default password is the roll number.');
      }
      setDialogOpen(false);
      load(editing ? meta.page : 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.user?.name}? Their attendance and leave records will be removed.`)) return;
    try {
      await api.delete(`/students/${row.id}`);
      toast.success('Student deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDetail = async (row) => {
    setDetail({ student: row, loading: true });
    setDetailLoading(true);
    try {
      const summary = await api.get(`/attendance/student/${row.id}/summary`);
      setDetail({ student: row, summary, loading: false });
    } catch (err) {
      toast.error(err.message);
      setDetail({ student: row, loading: false });
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'name,email,rollNumber,phone,guardianName,guardianPhone,admissionYear,classId,departmentId';
    const sample = `Riya Sharma,riya.sharma@student.sams.edu,2023CSE100,+91-8000000000,R Sharma,+91-7000000000,2023,${classOptions[0]?.value || ''},${deptOptions[0]?.value || ''}`;
    const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    let rows;
    try {
      rows = JSON.parse(importText);
    } catch {
      toast.error('Import data must be valid JSON (an array of student objects).');
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      toast.error('Provide a non-empty JSON array.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/students/bulk-import', { students: rows });
      toast.success(`Imported ${res.created} student(s), ${res.failed} failed`);
      setImportOpen(false);
      setImportText('');
      load(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadSampleJson = () => {
    const sample = [
      {
        name: 'Riya Sharma', email: 'riya.sharma@student.sams.edu', rollNumber: '2023CSE900',
        phone: '+91-8000000000', guardianName: 'R Sharma', guardianPhone: '+91-7000000000',
        admissionYear: 2023, classId: classOptions[0]?.value || '', departmentId: deptOptions[0]?.value || '',
      },
    ];
    setImportText(JSON.stringify(sample, null, 2));
  };

  const belowThreshold = detail?.summary?.subjects
    ? detail.summary.subjects.filter((s) => s.percentage < (detail.summary.threshold || 75)).length
    : 0;

  return (
    <div>
      <PageHeader title="Students" description="Student records, class allocation and attendance profiles.">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> CSV template
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Bulk import
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add student
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email or roll number..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={classFilter || 'all'} onValueChange={(v) => setClassFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <TableSkeleton cols={7} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No students found"
              description={query ? 'Try a different search term.' : 'Add students individually or import them in bulk.'}
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add student</Button>}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll no</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.rollNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium">{s.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.user?.email}</p>
                      </TableCell>
                      <TableCell>{s.class ? `${s.class.name}-${s.class.section}` : '-'}</TableCell>
                      <TableCell>{s.department?.code || '-'}</TableCell>
                      <TableCell>{s.guardianName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={s.user?.active ? 'success' : 'secondary'}>
                          {s.user?.active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(s)} title="View attendance">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" onClick={() => remove(s)} title="Delete"
                            className="text-red-600 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={meta.page} pages={meta.pages} total={meta.total} limit={meta.limit} onPageChange={load} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit student' : 'Add student'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the student record.' : 'A login is created automatically; the default password is the roll number.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Roll number *</Label>
                <Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required disabled={Boolean(editing)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {deptOptions.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Guardian name</Label>
                <Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Guardian phone</Label>
                <Input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Admission year</Label>
                <Input type="number" value={form.admissionYear} onChange={(e) => setForm({ ...form, admissionYear: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk import students</DialogTitle>
            <DialogDescription>
              Paste a JSON array. Each object needs name, email, rollNumber, classId and departmentId.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={loadSampleJson}>Load sample</Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> CSV template
              </Button>
            </div>
            <textarea
              rows={12}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
              placeholder='[{"name":"...","email":"...","rollNumber":"...","classId":"...","departmentId":"..."}]'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={runImport} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Import students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.student?.user?.name}</DialogTitle>
            <DialogDescription>
              {detail?.student?.rollNumber} · {detail?.student?.class?.name}-{detail?.student?.class?.section} · {detail?.student?.department?.name}
            </DialogDescription>
          </DialogHeader>
          {detailLoading || detail?.loading || !detail?.summary ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Overall" value={`${detail.summary.overall.percentage}%`} icon={Users} />
                <StatCard label="Present" value={detail.summary.overall.present} tone="success" />
                <StatCard
                  label="Below minimum"
                  value={`${belowThreshold} subject(s)`}
                  icon={AlertTriangle}
                  tone={belowThreshold > 0 ? 'destructive' : 'default'}
                />
              </div>
              <AttendanceProgress percentage={detail.summary.overall.percentage} threshold={detail.summary.threshold} />
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>On duty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.summary.subjects.map((s) => (
                      <TableRow key={s.subjectId}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{s.code}</p>
                        </TableCell>
                        <TableCell>{s.present}</TableCell>
                        <TableCell>{s.absent}</TableCell>
                        <TableCell>{s.late}</TableCell>
                        <TableCell>{s.onDuty}</TableCell>
                        <TableCell>{s.total}</TableCell>
                        <TableCell>
                          <Badge variant={s.percentage >= detail.summary.threshold ? 'success' : 'destructive'}>
                            {s.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
