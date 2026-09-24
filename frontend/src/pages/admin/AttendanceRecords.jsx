import { useEffect, useState } from 'react';
import { Search, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, Pagination, StatCard } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { statusVariant, formatDate } from '@/lib/utils';
import { loadClassOptions, loadSubjectOptions } from '@/lib/options';

export default function AttendanceRecordsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ classId: '', subjectId: '', status: '', from: '', to: '' });
  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);

  useEffect(() => {
    Promise.all([loadClassOptions(), loadSubjectOptions()])
      .then(([c, s]) => { setClassOptions(c); setSubjectOptions(s); })
      .catch((e) => toast.error(e.message));
  }, []);

  const load = async (page = meta.page) => {
    setLoading(true);
    try {
      const data = await api.get('/attendance', { page, limit: meta.limit, ...filters });
      setItems(data.items);
      setMeta({ page: data.page, pages: data.pages || 1, total: data.total, limit: data.limit });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const remove = async (row) => {
    if (!window.confirm('Delete this attendance record? Percentages will be recalculated.')) return;
    try {
      await api.delete(`/attendance/${row.id}`);
      toast.success('Record deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Records"
        description="Audit-ready log of every marked period. Admins can correct records outside the faculty edit window."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Records in view" value={meta.total} />
        <StatCard label="Present" value={items.filter((i) => i.status === 'PRESENT').length} tone="success" />
        <StatCard label="Absent" value={items.filter((i) => i.status === 'ABSENT').length} tone="destructive" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 grid gap-2 md:grid-cols-5">
            <Select value={filters.classId || 'all'} onValueChange={(v) => setFilters({ ...filters, classId: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.subjectId || 'all'} onValueChange={(v) => setFilters({ ...filters, subjectId: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjectOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['PRESENT', 'ABSENT', 'LATE', 'ON_DUTY'].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>

          {loading ? (
            <TableSkeleton cols={7} />
          ) : items.length === 0 ? (
            <EmptyState title="No attendance records" description="Adjust the filters or mark attendance first." icon={Filter} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marked by</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(r.date)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{r.student?.user?.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{r.student?.rollNumber}</p>
                      </TableCell>
                      <TableCell className="text-sm">{r.class ? `${r.class.name}-${r.class.section}` : '-'}</TableCell>
                      <TableCell className="text-sm">{r.subject?.code}</TableCell>
                      <TableCell>{r.period ?? '-'}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{r.faculty?.user?.name || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon" onClick={() => remove(r)}
                          className="text-red-600 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}
