import { useEffect, useState } from 'react';
import { Check, X, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { statusVariant, formatDate } from '@/lib/utils';

/**
 * Approval queue for leave and on-duty requests. Shared by admin and faculty
 * portals; the API scopes what a faculty member is allowed to see.
 */
export default function LeaveRequestsPanel({ title = 'Leave & On-Duty Requests', description }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [status, setStatus] = useState('PENDING');
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/leaves', {
        page, limit: meta.limit, status: status === 'ALL' ? undefined : status,
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
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const decide = async (approve) => {
    setSaving(true);
    try {
      await api.patch(`/leaves/${decision.id}/decide`, {
        status: approve ? 'APPROVED' : 'REJECTED',
        approverRemarks: remarks || undefined,
      });
      toast.success(`Request ${approve ? 'approved' : 'rejected'}`);
      if (approve) {
        toast.message('Attendance auto-adjusted', {
          description: 'Matching periods for the leave dates were updated.',
        });
      }
      setDecision(null);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const days = (l) =>
    Math.round((new Date(l.toDate) - new Date(l.fromDate)) / 86400000) + 1;

  return (
    <div>
      <PageHeader title={title} description={description} />

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <CardContent className="p-4">
          {loading ? (
            <TableSkeleton cols={7} />
          ) : items.length === 0 ? (
            <EmptyState
              title={`No ${status.toLowerCase() === 'all' ? '' : status.toLowerCase()} requests`}
              description="Nothing to action right now."
              icon={FileText}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">{l.student?.user?.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{l.student?.rollNumber}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.student?.class ? `${l.student.class.name}-${l.student.class.section}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.type === 'ON_DUTY' ? 'info' : 'secondary'}>
                          {l.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                        <span className="ml-1 text-muted-foreground">({days(l)}d)</span>
                      </TableCell>
                      <TableCell className="max-w-[240px] text-xs">
                        <p className="truncate">{l.reason}</p>
                        {l.approverRemarks && (
                          <p className="truncate text-muted-foreground">Remarks: {l.approverRemarks}</p>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="success" onClick={() => { setDecision(l); setRemarks(''); }}>
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDecision(l); setRemarks(''); }}>
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {l.approvedBy?.name ? `by ${l.approvedBy.name}` : '—'}
                          </span>
                        )}
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

      <Dialog open={Boolean(decision)} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decision on {decision?.student?.user?.name}'s request</DialogTitle>
            <DialogDescription>
              {decision?.type?.replace('_', ' ')} from {formatDate(decision?.fromDate)} to {formatDate(decision?.toDate)}.
              Approving will adjust attendance for the covered dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add a note for the student" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => decide(false)}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Reject
            </Button>
            <Button variant="success" onClick={() => decide(true)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
