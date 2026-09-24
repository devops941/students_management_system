import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, ErrorState } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DAY_NAMES } from '@/lib/utils';
import { loadClassOptions, loadSubjectOptions, loadFacultyOptions } from '@/lib/options';

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [form, setForm] = useState({
    dayOfWeek: '1', period: '1', startTime: '09:00', endTime: '09:50', room: '', subjectId: '', facultyId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadClassOptions(), loadSubjectOptions(), loadFacultyOptions()])
      .then(([c, s, f]) => {
        setClasses(c);
        setSubjects(s);
        setFacultyOptions(f);
        if (c[0]) setClassId(c[0].value);
      })
      .catch((e) => setError(e.message));
  }, []);

  const loadSlots = (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get('/timetable', { classId: id, limit: 100 })
      .then((data) => setSlots(data.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSlots(classId);
  }, [classId]);

  const addSlot = async (e) => {
    e.preventDefault();
    if (!form.subjectId || !form.facultyId) {
      toast.error('Select a subject and faculty member');
      return;
    }
    setSaving(true);
    try {
      await api.post('/timetable', {
        ...form,
        dayOfWeek: Number(form.dayOfWeek),
        period: Number(form.period),
        classId,
      });
      toast.success('Period added to timetable');
      setDialogOpen(false);
      loadSlots(classId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slot) => {
    if (!window.confirm('Remove this period from the timetable?')) return;
    try {
      await api.delete(`/timetable/${slot.id}`);
      toast.success('Period removed');
      loadSlots(classId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cellFor = (day, period) =>
    slots.find((s) => s.dayOfWeek === day && s.period === period);

  const className = classes.find((c) => c.value === classId)?.label;

  return (
    <div>
      <PageHeader
        title="Timetable"
        description="Weekly period schedule for each class. Periods drive faculty assignments and attendance sessions."
      >
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Choose class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)} disabled={!classId}>
          <Plus className="h-4 w-4" /> Add period
        </Button>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={() => loadSlots(classId)} />}

      {loading ? (
        <Skeleton className="h-96" />
      ) : slots.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No timetable for this class"
              description="Add periods to build the weekly schedule."
              action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Add period</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-4">
            <p className="mb-3 text-sm font-medium">{className}</p>
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2 text-left text-xs uppercase text-muted-foreground">Period</th>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <th key={d} className="border-b p-2 text-left text-xs uppercase text-muted-foreground">
                      {DAY_NAMES[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <td className="border-b p-2 align-top text-xs font-semibold">P{p}</td>
                    {[1, 2, 3, 4, 5].map((d) => {
                      const slot = cellFor(d, p);
                      return (
                        <td key={d} className="border-b p-2 align-top">
                          {slot ? (
                            <div className="group relative rounded-md border bg-primary/5 p-2">
                              <p className="text-xs font-semibold">{slot.subject?.name}</p>
                              <p className="text-[11px] text-muted-foreground">{slot.faculty?.user?.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {slot.startTime}-{slot.endTime} {slot.room ? `· ${slot.room}` : ''}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeSlot(slot)}
                                className="absolute right-1 top-1 hidden rounded p-1 text-red-600 hover:bg-red-50 group-hover:block"
                                title="Remove period"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{slots.length} periods scheduled</Badge>
              <Badge variant="secondary">{new Set(slots.map((s) => s.subjectId)).size} subjects</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add period</DialogTitle>
            <DialogDescription>Schedule a subject with its faculty for {className}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addSlot} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Select value={form.facultyId} onValueChange={(v) => setForm({ ...form, facultyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                <SelectContent>
                  {facultyOptions.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="CSE-3A-R1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add period
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
