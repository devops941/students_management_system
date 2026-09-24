import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { loadDepartmentOptions } from '@/lib/options';

const emptyForm = { name: '', email: '', employeeCode: '', designation: 'Assistant Professor', departmentId: '', phone: '' };

export default function FacultyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [query, setQuery] = useState('');
  const [deptOptions, setDeptOptions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDepartmentOptions().then(setDeptOptions).catch((e) => toast.error(e.message));
  }, []);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/faculty-list', { page, limit: meta.limit, q: query || undefined });
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
  }, [query]);

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
      employeeCode: row.employeeCode || '',
      designation: row.designation || '',
      departmentId: row.department?.id || '',
      phone: row.user?.phone || '',
    });
    setDialogOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.employeeCode || !form.departmentId) {
      toast.error('Name, email, employee code and department are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/faculty-list/${editing.id}`, form);
        toast.success('Faculty updated');
      } else {
        await api.post('/faculty-list', form);
        toast.success('Faculty created. Default password is the employee code.');
      }
      setDialogOpen(false);
      load(editing ? meta.page : 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/faculty-list/${target.id}`);
      toast.success('Faculty deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Faculty" description="Teaching staff, their department and assigned subjects.">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add faculty</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 sm:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email or code..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <TableSkeleton cols={6} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No faculty found"
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add faculty</Button>}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.employeeCode}</TableCell>
                      <TableCell>
                        <p className="font-medium">{f.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{f.user?.email}</p>
                      </TableCell>
                      <TableCell>{f.designation}</TableCell>
                      <TableCell>{f.department?.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {f.subjects?.length ? (
                            f.subjects.slice(0, 2).map((s) => (
                              <Badge key={s.id} variant="secondary" className="text-[10px]">{s.code}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                          {f.subjects?.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">+{f.subjects.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                          <Button
                            variant="ghost" size="icon" onClick={() => setDeleteTarget(f)}
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Delete {deleteTarget?.user?.name}? This removes their login and assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemove}>Delete faculty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit faculty' : 'Add faculty'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the faculty record.' : 'A login is created automatically; the default password is the employee code.'}
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
                <Label>Employee code *</Label>
                <Input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required disabled={Boolean(editing)} />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
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
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create faculty'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
