import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';

const SEVERITY_VARIANT = { HIGH: 'destructive', MEDIUM: 'warning', LOW: 'secondary' };

export default function StudentAlertsPage() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get('/alerts/mine').then(setItems).catch((e) => toast.error(e.message));
  };
  useEffect(load, []);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.patch('/alerts/read-all');
      toast.success('All alerts marked as read');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!items) {
    return (
      <div>
        <PageHeader title="Alerts" description="Attendance warnings and leave updates." />
        <TableSkeleton cols={4} />
      </div>
    );
  }

  const unread = items.filter((a) => !a.isRead).length;
  const shortages = items.filter((a) => a.type === 'SHORTAGE');

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Attendance warnings and leave decisions addressed to you."
      >
        <Button variant="outline" onClick={markAllRead} disabled={busy || unread === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Mark all read
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total alerts" value={items.length} icon={Bell} />
        <StatCard label="Unread" value={unread} tone={unread ? 'warning' : 'default'} icon={BellOff} />
        <StatCard label="Attendance warnings" value={shortages.length} icon={AlertTriangle} tone={shortages.length ? 'destructive' : 'default'} />
      </div>

      <Card>
        <CardContent className="p-4">
          {items.length === 0 ? (
            <EmptyState
              title="No alerts"
              description="You're all clear. Attendance warnings and leave updates will appear here."
              icon={BellOff}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className={a.isRead ? '' : 'bg-primary/5'}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={a.type === 'SHORTAGE' ? 'destructive' : 'info'}>
                        {a.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.type === 'SHORTAGE'
                        ? <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-[420px] text-sm">
                      {a.message}
                      {a.type === 'SHORTAGE' && (
                        <p className="text-xs text-muted-foreground">
                          Current {a.percentage}% · required {a.threshold}%
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.isRead ? 'secondary' : 'warning'}>
                        {a.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!a.isRead && (
                        <Button variant="ghost" size="sm" onClick={() => markRead(a.id)}>Mark read</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {shortages.length > 0 && (
        <div className="mt-4 text-center">
          <Button asChild variant="outline">
            <Link to="/student/attendance">Review my attendance</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
