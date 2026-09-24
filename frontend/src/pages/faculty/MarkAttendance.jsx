import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Check, X, Clock, Shield, Loader2, Users, UserCheck, Percent } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn, todayISO } from '@/lib/utils';

const STATUSES = [
  { value: 'PRESENT', label: 'P', full: 'Present' },
  { value: 'ABSENT', label: 'A', full: 'Absent' },
  { value: 'LATE', label: 'L', full: 'Late' },
  { value: 'ON_DUTY', label: 'OD', full: 'On duty' },
];

const STATUS_STYLE = {
  PRESENT: 'bg-emerald-600 text-white hover:bg-emerald-600',
  ABSENT: 'bg-red-600 text-white hover:bg-red-600',
  LATE: 'bg-amber-500 text-white hover:bg-amber-500',
  ON_DUTY: 'bg-sky-600 text-white hover:bg-sky-600',
};

/**
 * The main faculty workflow: pick class + subject + date + period, mark the
 * whole roster in one pass, then save as a single batch.
 */
export default function MarkAttendancePage() {
  const [params, setParams] = useSearchParams();
  const [assignments, setAssignments] = useState(null);
  const [classId, setClassId] = useState(params.get('classId') || '');
  const [subjectId, setSubjectId] = useState(params.get('subjectId') || '');
  const [date, setDate] = useState(todayISO());
  const [period, setPeriod] = useState(params.get('period') || '');
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    api.get('/faculty/me/assignments').then((data) => {
      setAssignments(data);
      if (!classId && data.classes[0]) setClassId(data.classes[0].id);
      if (!subjectId && data.subjects[0]) setSubjectId(data.subjects[0].id);
    }).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL shareable/deep-linkable so the dashboard "Mark" button works.
  useEffect(() => {
    const next = {};
    if (classId) next.classId = classId;
    if (subjectId) next.subjectId = subjectId;
    if (period) next.period = period;
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, period]);

  const loadRoster = async () => {
    if (!classId || !subjectId || !date) return;
    setLoading(true);
    try {
      const data = await api.get('/attendance/session', {
        classId, subjectId, date, period: period || undefined,
      });
      setRoster(data);
      const next = {};
      data.forEach((r) => {
        next[r.studentId] = r.status || 'PRESENT';
      });
      setEntries(next);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, date, period]);

  const setAll = (status) => {
    const next = {};
    roster.forEach((r) => { next[r.studentId] = status; });
    setEntries(next);
  };

  const save = async () => {
    if (roster.length === 0) return;
    setSaving(true);
    try {
      const records = roster.map((r) => ({
        studentId: r.studentId,
        status: entries[r.studentId] || 'PRESENT',
      }));
      const res = await api.post('/attendance/mark', {
        classId, subjectId, date, period: period || null, records,
      });
      const now = new Date();
      setLastSaved({ at: now, saved: res.saved });
      toast.success(`Saved ${res.saved} record(s)`);
      if (res.alertsRaised > 0) {
        toast.warning(`${res.alertsRaised} shortage alert(s) raised or updated`, {
          description: 'Students have dropped below the minimum attendance.',
        });
      }
      loadRoster();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const values = Object.values(entries);
    const count = (s) => values.filter((v) => v === s).length;
    const attended = count('PRESENT') + count('LATE') + count('ON_DUTY');
    return {
      total: values.length,
      present: count('PRESENT'),
      absent: count('ABSENT'),
      late: count('LATE'),
      onDuty: count('ON_DUTY'),
      percentage: values.length ? Math.round((attended / values.length) * 10000) / 100 : 0,
    };
  }, [entries]);

  const alreadyMarked = roster.some((r) => r.attendanceId);
  const subjectLabel = assignments?.subjects.find((s) => s.id === subjectId);
  const classLabel = assignments?.classes.find((c) => c.id === classId);

  if (!assignments) {
    return (
      <div>
        <PageHeader title="Mark Attendance" description="Loading your teaching assignments..." />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (assignments.subjects.length === 0) {
    return (
      <div>
        <PageHeader title="Mark Attendance" />
        <Card>
          <CardContent>
            <EmptyState
              title="No subjects assigned"
              description="Ask the administrator to assign you subjects before marking attendance."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mark Attendance"
        description="Select the session, mark the roster and save. Percentages and alerts update immediately."
      >
        {lastSaved && (
          <Badge variant="secondary" className="h-9 px-3">
            Last saved {lastSaved.at.toLocaleTimeString('en-IN')} · {lastSaved.saved} record(s)
          </Badge>
        )}
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {assignments.classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}-{c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {assignments.subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Date</Label>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Period</Label>
            <Select value={period || 'none'} onValueChange={(v) => setPeriod(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Any period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific period</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students in roster" value={summary.total} icon={Users} />
        <StatCard label="Present / Late / OD" value={summary.present + summary.late + summary.onDuty} icon={UserCheck} tone="success" />
        <StatCard label="Absent" value={summary.absent} icon={X} tone="destructive" />
        <StatCard label="Session percentage" value={`${summary.percentage}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              {subjectLabel?.name} · {classLabel ? `${classLabel.name}-${classLabel.section}` : ''}
            </CardTitle>
            <CardDescription>
              {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {period ? ` · Period ${period}` : ''}
              {alreadyMarked ? ' · already marked (editing)' : ''}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll('PRESENT')}>
              <Check className="h-4 w-4" /> All present
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll('ABSENT')}>
              <X className="h-4 w-4" /> All absent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton cols={4} />
          ) : roster.length === 0 ? (
            <EmptyState
              title="No students in this class"
              description="This class has no enrolled students yet."
            />
          ) : (
            <div className="space-y-2">
              {roster.map((s, idx) => (
                <div
                  key={s.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs text-muted-foreground">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{s.rollNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {STATUSES.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        title={st.full}
                        onClick={() => setEntries((e) => ({ ...e, [s.studentId]: st.value }))}
                        className={cn(
                          'h-9 w-11 rounded-md border text-xs font-bold transition-all',
                          entries[s.studentId] === st.value
                            ? cn(STATUS_STYLE[st.value], 'border-transparent shadow-sm')
                            : 'bg-background hover:bg-accent',
                        )}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {roster.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Edits are logged. Records older than the edit window need an admin.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={loadRoster} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Reload
                </Button>
                <Button onClick={save} disabled={saving || roster.length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save attendance
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
