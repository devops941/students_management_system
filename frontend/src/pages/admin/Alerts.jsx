import { useEffect, useState } from 'react';
import { Bell, Check, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard, Pagination } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';

const SEVERITY = { HIGH: 'destructive', MEDIUM: 'warning', LOW: 'secondary' };

export default function AlertsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('OPEN');
  const [regenerating, setRegenerating] = useState(false);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/alerts', { page, limit: 20, status: status === 'ALL' ? undefined : status });
      setItems(data.items);
      setMeta({ page: data.page, pages: data.pages || 1, total: data.total });
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

  const resolve = async (row) => {
    try {
      await api.patch(`/alerts/${row.id}/resolve`);
      toast.success('Alert marked as resolved');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post('/alerts/regenerate');
      toast.success(`Alert scan complete: ${res.created} new, ${res.resolved} auto-resolved`);
      load(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const high = items.filter((i) => i.severity === 'HIGH').length;

  return (
    <div>
      <PageHeader
        title="Shortage Alerts"
        description="Automatic alerts raised when a student's attendance drops below the configured minimum."
      >
        <Button variant="outline" onClick={regenerate} disabled={regenerating}>
          <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} /> Run scan now
        </Button>
        <Button
          onClick={() => api.post('/alerts/notify').then((r) => toast.success(`Notified ${r.notified} guardian(s)`)).catch((e) => toast.error(e.message))}
        >
          <Send className="h-4 w-4" /> Notify guardians
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Alerts in view" value={meta.total} icon={Bell} />
        <StatCard label="High severity" value={high} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Status filter" value={status} />
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="OPEN">Open</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <CardContent className="p-4">
          {loading ? (
            <TableSkeleton cols={6} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No alerts"
              description="No shortage alerts match this filter. Run a scan to refresh."
              icon={Bell}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Raised</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium">{a.student?.user?.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{a.student?.rollNumber}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.student?.class ? `${a.student.class.name}-${a.student.class.section}` : '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-xs">{a.message}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{a.percentage}%</Badge>
                        <span className="ml-2 text-[11px] text-muted-foreground">min {a.threshold}%</span>
                      </TableCell>
                      <TableCell><Badge variant={SEVERITY[a.severity]}>{a.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDateTime(a.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {a.status === 'OPEN' ? (
                          <Button size="sm" variant="outline" onClick={() => resolve(a)}>
                            <Check className="h-3.5 w-3.5" /> Resolve
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Resolved</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPageChange={load} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
