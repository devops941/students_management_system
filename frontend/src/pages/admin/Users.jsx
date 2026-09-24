import { useEffect, useState } from 'react';
import { Search, Plus, Loader2, Power, Trash2, ShieldCheck } from 'lucide-react';
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
import { formatDateTime } from '@/lib/utils';

const ROLE_VARIANT = { ADMIN: 'destructive', FACULTY: 'info', STUDENT: 'success', PARENT: 'secondary' };

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FACULTY', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/users', { page, limit: meta.limit, q: query || undefined, role: role || undefined });
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
  }, [query, role]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('User account created');
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', role: 'FACULTY', phone: '' });
      load(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row) => {
    try {
      await api.patch(`/users/${row.id}/toggle`);
      toast.success(`${row.name} ${row.active ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete account for ${row.name}?`)) return;
    try {
      await api.delete(`/users/${row.id}`);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="User Accounts" description="Login accounts for every role. Role-based access is enforced by the API.">
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Add user</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or email..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <TableSkeleton cols={6} />
          ) : items.length === 0 ? (
            <EmptyState title="No users found" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Linked profile</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {u.student ? `${u.student.rollNumber} · ${u.student.class?.name}-${u.student.class?.section}` : ''}
                        {u.faculty ? `${u.faculty.employeeCode} · ${u.faculty.designation}` : ''}
                        {!u.student && !u.faculty ? '-' : ''}
                      </TableCell>
                      <TableCell className="text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? 'Active' : 'Disabled'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggle(u)} title={u.active ? 'Disable' : 'Enable'}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" onClick={() => remove(u)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user account</DialogTitle>
            <DialogDescription>
              Directory profiles (students/faculty) are created from their own screens; use this for general accounts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ADMIN', 'FACULTY', 'STUDENT', 'PARENT'].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ShieldCheck className="h-4 w-4" /> Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
