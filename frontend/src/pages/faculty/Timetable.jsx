import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, StatCard } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DAY_NAMES } from '@/lib/utils';

export default function FacultyTimetablePage() {
  const [data, setData] = useState(null);
  const [day, setDay] = useState(new Date().getDay());

  useEffect(() => {
    api.get('/faculty/me/assignments').then(setData).catch((e) => toast.error(e.message));
  }, []);

  const byDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    (data?.timetable || []).forEach((t) => {
      if (map[t.dayOfWeek]) map[t.dayOfWeek].push(t);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.period - b.period));
    return map;
  }, [data]);

  if (!data) {
    return (
      <div>
        <PageHeader title="My Timetable" description="Your weekly teaching schedule." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const todaySlots = byDay[day] || [];
  const totalPeriods = data.timetable.length;

  return (
    <div>
      <PageHeader title="My Timetable" description="Your weekly teaching schedule across all classes." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Weekly periods" value={totalPeriods} icon={CalendarDays} />
        <StatCard label="Subjects" value={data.subjects.length} />
        <StatCard label={`Periods on ${DAY_NAMES[day]}`} value={todaySlots.length} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <Button
            key={d}
            variant={day === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDay(d)}
          >
            {DAY_NAMES[d]}
            <Badge variant={day === d ? 'secondary' : 'outline'} className="ml-1">
              {byDay[d]?.length || 0}
            </Badge>
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
              title="No periods on this day"
              description="Enjoy the free day — or pick another day above."
              icon={CalendarDays}
            />
          ) : (
            <div className="space-y-3">
              {todaySlots.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[10px] uppercase">Period</span>
                      <span className="text-lg font-bold leading-none">{t.period}</span>
                    </div>
                    <div>
                      <p className="font-medium">{t.subject?.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{t.subject?.code}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {t.startTime}–{t.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {t.class?.name}-{t.class?.section}
                        </span>
                        {t.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {t.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/faculty/mark-attendance?classId=${t.classId}&subjectId=${t.subjectId}&period=${t.period}`}>
                      Mark attendance
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
