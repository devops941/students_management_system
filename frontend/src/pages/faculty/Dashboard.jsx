import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, School, Users, ClipboardCheck, FileText, AlertTriangle,
  CalendarDays, TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '@/lib/api';
import { PageHeader, StatCard, ErrorState, EmptyState } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DAY_NAMES } from '@/lib/utils';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.get('/dashboard/faculty').then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <div>
        <PageHeader title="Faculty Dashboard" description="Your teaching load and attendance activity." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const { faculty, counts, subjects, todaysSchedule, trend, recentSessions } = data;
  const today = new Date().getDay();

  return (
    <div>
      <PageHeader
        title={`Welcome, ${faculty?.user?.name?.split(' ').slice(0, 2).join(' ') || 'Professor'}`}
        description={`${faculty?.designation || 'Faculty'} · ${faculty?.department?.name || ''} (${faculty?.employeeCode || ''})`}
      >
        <Button variant="outline" asChild>
          <Link to="/faculty/reports">My reports <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild>
          <Link to="/faculty/mark-attendance"><ClipboardCheck className="h-4 w-4" /> Mark attendance</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subjects assigned" value={counts.subjects} icon={BookOpen} />
        <StatCard label="Classes taught" value={counts.classes} icon={School} />
        <StatCard label="Students" value={counts.students} icon={Users} />
        <StatCard
          label="Pending leave requests"
          value={counts.pendingLeaves}
          icon={FileText}
          tone={counts.pendingLeaves > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Attendance trend in my subjects
            </CardTitle>
            <CardDescription>Last 14 days across your assigned subjects.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {trend.length === 0 ? (
              <EmptyState title="No attendance recorded yet" description="Mark a session to start building the trend." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                  <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Today · {DAY_NAMES[today]}
            </CardTitle>
            <CardDescription>{todaysSchedule.length} period(s) scheduled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysSchedule.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No periods scheduled today.</p>
            ) : (
              todaysSchedule.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.subject?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.class ? `${s.class.name}-${s.class.section}` : ''} · P{s.period}
                      {s.startTime ? ` · ${s.startTime}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/faculty/mark-attendance?classId=${s.classId}&subjectId=${s.subjectId}&period=${s.period}`}>
                      Mark
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My subjects</CardTitle>
            <CardDescription>Attendance percentage across all students in each subject.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned yet. Ask the admin to assign you subjects.</p>
            ) : (
              subjects.map((s) => (
                <Link
                  key={s.id}
                  to={`/faculty/mark-attendance?subjectId=${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                  </div>
                  <Badge variant={s.averagePercentage >= 75 ? 'success' : 'destructive'}>
                    {s.averagePercentage}%
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Recent sessions marked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions marked yet.</p>
            ) : (
              recentSessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.className} · P{s.period} · {new Date(s.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{s.present}/{s.total}</p>
                    <p className="text-[11px] text-muted-foreground">present</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
