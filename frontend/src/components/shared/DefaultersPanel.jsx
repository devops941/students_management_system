import { useEffect, useState } from 'react';
import { Search, Send, AlertTriangle, UserX, Download } from 'lucide-react';
import { toast } from 'sonner';
import api, { downloadReport } from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { loadClassOptions } from '@/lib/options';

export default function DefaultersPanel({ canNotify = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('75');
  const [classId, setClassId] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [notifying, setNotifying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadClassOptions().then(setClassOptions).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/attendance/defaulters', {
        threshold, classId: classId || undefined,
      });
      setItems(data.items);
      setResult({ threshold: data.threshold, count: data.count });
      setSelected([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, classId]);

  const notify = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    setNotifying(true);
    try {
      const res = await api.post('/attendance/notify-defaulters', { studentIds: selected });
      toast.success(`Warning sent for ${res.notified} student(s)`);
      setSelected([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setNotifying(false);
    }
  };

  const toggleAll = (checked) => setSelected(checked ? items.map((i) => i.studentId) : []);
  const toggleOne = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const critical = items.filter((i) => i.percentage < Number(threshold) - 15).length;

  return (
    <div>
      <PageHeader
        title="Defaulter List"
        description="Students below the minimum attendance requirement, sorted by percentage."
      >
        <Button variant="outline" onClick={() => downloadReport({ type: 'defaulters', classId: classId || undefined })}>
          <Download className="h-4 w-4" /> Export
        </Button>
        {canNotify && (
          <Button onClick={notify} disabled={notifying || selected.length === 0}>
            <Send className="h-4 w-4" /> Notify selected ({selected.length})
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Defaulters found" value={result?.count ?? 0} icon={UserX} tone="destructive" />
        <StatCard label="Critically low" value={critical} hint={`below ${Number(threshold) - 15}%`} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Threshold used" value={`${threshold}%`} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={classId || 'all'} onValueChange={(v) => setClassId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={threshold} onValueChange={setThreshold}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['60', '65', '70', '75', '80', '85', '90'].map((t) => (
                  <SelectItem key={t} value={t}>Below {t}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <TableSkeleton cols={7} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No defaulters"
              description={`Everyone in this selection is at or above ${threshold}% attendance.`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canNotify && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selected.length === items.length}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead>Roll no</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Percentage</TableHead>
                  {canNotify && <TableHead>Guardian</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.studentId}>
                    {canNotify && (
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(s.studentId)}
                          onCheckedChange={() => toggleOne(s.studentId)}
                          aria-label={`Select ${s.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{s.rollNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{s.class}</TableCell>
                    <TableCell>{s.present}</TableCell>
                    <TableCell>{s.absent}</TableCell>
                    <TableCell>{s.total}</TableCell>
                    <TableCell>
                      <Badge variant={s.percentage < Number(threshold) - 15 ? 'destructive' : 'warning'}>
                        {s.percentage}%
                      </Badge>
                    </TableCell>
                    {canNotify && (
                      <TableCell className="text-xs">
                        {s.guardianEmail ? (
                          <span className="text-emerald-600 dark:text-emerald-400">On file</span>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
