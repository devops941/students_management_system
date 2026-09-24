import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, StatCard } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DAY_NAMES } from '@/lib/utils';

export default function StudentTimetablePage() {
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState(new Date().getDay());

  useEffect(() => {
    // The attendance payload carries the student's class; use it to fetch the
    // timetable for that class via the student's own permitted endpoints.
    api.get('/students/me/attendance')
      .then(async (summary) => {
        const classId = summary.student?.class?.id;
        if (!classId) return setSlots([]);
        const res = await api.get('/timetable', { classId, limit: 100 });
        setSlots(res.items);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const byDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    (slots || []).forEach((t) => {
      if (map[t.dayOfWeek]) map[t.dayOfWeek].push(t);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.period - b.period));
    return map;
  }, [slots]);

  if (!slots) {
    return (
      <div>
        <PageHeader title="My Timetable" description="Your weekly class schedule." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const todaySlots = byDay[day] || [];

  return (
    <div>
      <PageHeader title="My Timetable" description="Your weekly class schedule." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Weekly periods" value={slots.length} icon={CalendarDays} />
        <StatCard label={`Periods on ${DAY_NAMES[day]}`} value={todaySlots.length} tone="success" />
        <StatCard label="Subjects" value={new Set(slots.map((s) => s.subjectId)).size} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <Button key={d} variant={day === d ? 'default' : 'outline'} size="sm" onClick={() => setDay(d)}>
            {DAY_NAMES[d]}
            <Badge variant={day === d ? 'secondary' : 'outline'} className="ml-1">{byDay[d]?.length || 0}</Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{DAY_NAMES[day]}</CardTitle>
          <CardDescription>{todaySlots.length} period(s) scheduled.</CardDescription>
        </CardHeader>
        <CardContent>
          {todaySlots.length === 0 ? (
            <EmptyState
              title="No classes on this day"
              description="Pick another day to see your schedule."
              icon={CalendarDays}
            />
          ) : (
            <div className="space-y-3">
              {todaySlots.map((t) => (
                <div key={t.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] uppercase">P</span>
                    <span className="text-lg font-bold leading-none">{t.period}</span>
                  </div>
                  <div>
                    <p className="font-medium">{t.subject?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.faculty?.user?.name} · {t.startTime}–{t.endTime}
                      {t.room ? ` · ${t.room}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
