import { useEffect, useState } from 'react';
import { Search, ScrollText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination, StatCard } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';

const ACTION_VARIANT = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  LOGIN: 'secondary',
  APPROVE: 'success',
  REJECT: 'warning',
};

export default function AuditLogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/audit-logs', {
        page, limit: 25, q: query || undefined, action: action || undefined,
      });
      setItems(data.items);
      setMeta({ page: data.page, pages: data.pages || 1, total: data.total });
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
  }, [query, action]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable trail of who changed what and when — useful for compliance and troubleshooting."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total entries" value={meta.total} icon={ScrollText} />
        <StatCard label="Shown" value={items.length} />
        <StatCard label="Filter" value={action || 'All actions'} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entity, actor or details..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={action || 'all'} onValueChange={(v) => setAction(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT'].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <TableSkeleton cols={5} />
          ) : items.length === 0 ? (
            <EmptyState title="No audit entries" description="Actions performed by users will appear here." icon={Filter} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{log.actor?.name || 'System'}</p>
                        <p className="text-[11px] text-muted-foreground">{log.actorRole || '-'}</p>
                      </TableCell>
                      <TableCell><Badge variant={ACTION_VARIANT[log.action] || 'secondary'}>{log.action}</Badge></TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono">{log.entity}</span>
                        {log.entityId && <p className="truncate text-[11px] text-muted-foreground">{log.entityId}</p>}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-xs">
                        <p className="truncate">{log.description || '-'}</p>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{log.ipAddress || '-'}</TableCell>
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
