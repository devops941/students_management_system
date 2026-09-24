import { useEffect, useState } from 'react';
import { Plus, Loader2, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard } from '@/components/shared';
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
import { statusVariant, formatDate, todayISO } from '@/lib/utils';

export default function StudentLeavesPage() {
  const [items, setItems] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    fromDate: todayISO(),
    toDate: todayISO(),
    type: 'LEAVE',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/students/me/leaves').then(setItems).catch((e) => toast.error(e.message));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    setSaving(true);
    try {
      await api.post('/leaves', form);
      toast.success('Request submitted for approval');
      setDialogOpen(false);
      setForm({ fromDate: todayISO(), toDate: todayISO(), type: 'LEAVE', reason: '' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (row) => {
    if (!window.confirm('Cancel this pending request?')) return;
    try {
      await api.delete(`/leaves/${row.id}`);
      toast.success('Request cancelled');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const days = (l) => Math.round((new Date(l.toDate) - new Date(l.fromDate)) / 86400000) + 1;

  if (!items) {
    return (
      <div>
        <PageHeader title="Leave & On-Duty Requests" description="Apply for leave and track approvals." />
        <TableSkeleton cols={6} />
      </div>
    );
  }

  const pending = items.filter((i) => i.status === 'PENDING').length;
  const approved = items.filter((i) => i.status === 'APPROVED').length;

  return (
    <div>
      <PageHeader
        title="Leave & On-Duty Requests"
        description="Apply for medical leave, family events or on-duty activities. Approved leave adjusts your attendance."
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New request
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total requests" value={items.length} icon={FileText} />
        <StatCard label="Pending" value={pending} tone="warning" />
        <StatCard label="Approved" value={approved} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          {items.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Apply for leave when you are going to miss classes."
              icon={FileText}
              action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New request</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant={l.type === 'ON_DUTY' ? 'info' : 'secondary'}>
                        {l.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatDate(l.fromDate)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatDate(l.toDate)}</TableCell>
                    <TableCell>{days(l)}</TableCell>
                    <TableCell className="max-w-[220px] text-xs">{l.reason}</TableCell>
                    <TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.approverRemarks || '—'}</TableCell>
                    <TableCell>
                      {l.status === 'PENDING' && (
                        <Button
                          variant="ghost" size="icon" onClick={() => cancel(l)}
                          className="text-red-600 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
            <DialogDescription>
              Approved requests for these dates update your attendance automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Request type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAVE">Leave (medical / personal)</SelectItem>
                  <SelectItem value="ON_DUTY">On duty (event / competition)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From date</Label>
                <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>To date</Label>
                <Input type="date" value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <textarea
                rows={3}
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Explain briefly, e.g. medical leave with fever"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
