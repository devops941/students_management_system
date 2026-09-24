import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCog, School, BookOpen, Building2, GraduationCap,
  ClipboardCheck, FileText, AlertTriangle, TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';
import { PageHeader, StatCard, AttendanceProgress, ErrorState } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS = {
  PRESENT: '#10b981',
  ABSENT: '#ef4444',
  LATE: '#f59e0b',
  ON_DUTY: '#0ea5e9',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.get('/dashboard/admin').then(setData).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!data) {
    return (
      <div>
        <PageHeader title="Admin Dashboard" description="Institution-wide attendance overview." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const { counts, today, trend, recentAlerts, threshold } = data;

  const pieData = [
    { name: 'Present', value: today.present, key: 'PRESENT' },
    { name: 'Absent', value: today.absent, key: 'ABSENT' },
    { name: 'Late', value: today.late, key: 'LATE' },
    { name: 'On Duty', value: today.onDuty, key: 'ON_DUTY' },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description={`Academic year 2025-2026 · minimum attendance requirement ${threshold}%`}
      >
        <Button variant="outline" asChild>
          <Link to="/admin/reports">View reports <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild>
          <Link to="/admin/students">Manage students</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={counts.students} icon={Users} tone="default" />
        <StatCard label="Faculty" value={counts.faculty} icon={UserCog} tone="default" />
        <StatCard label="Classes" value={counts.classes} icon={School} tone="default" />
        <StatCard label="Subjects" value={counts.subjects} icon={BookOpen} tone="default" />
        <StatCard label="Departments" value={counts.departments} icon={Building2} tone="default" />
        <StatCard label="Courses" value={counts.courses} icon={GraduationCap} tone="default" />
        <StatCard
          label="Pending leaves"
          value={counts.pendingLeaves}
          icon={FileText}
          tone={counts.pendingLeaves > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Open shortage alerts"
          value={counts.openAlerts}
          icon={AlertTriangle}
          tone={counts.openAlerts > 0 ? 'destructive' : 'success'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Attendance trend (last 14 days)
            </CardTitle>
            <CardDescription>Overall percentage across all recorded sessions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance recorded in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Attendance']}
                    labelFormatter={(l) => formatDate(l)}
                  />
                  <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today ({formatDate(today.date)})</CardTitle>
            <CardDescription>
              {today.total > 0 ? `${today.total} records marked` : 'No attendance marked yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Attendance has not been marked today.
              </p>
            ) : (
              <>
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2">
                  <AttendanceProgress percentage={today.percentage} threshold={threshold} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Recent shortage alerts
              </CardTitle>
              <CardDescription>Students below the required attendance.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active shortage alerts. </p>
            ) : (
              recentAlerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.student?.user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                  </div>
                  <Badge variant="destructive">{a.percentage}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Quick actions
            </CardTitle>
            <CardDescription>Common administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/admin/students', label: 'Add / import students', icon: Users },
              { to: '/admin/faculty', label: 'Manage faculty', icon: UserCog },
              { to: '/admin/timetable', label: 'Build timetable', icon: School },
              { to: '/admin/defaulters', label: 'Defaulter list', icon: AlertTriangle },
              { to: '/admin/leaves', label: 'Approve leaves', icon: FileText },
              { to: '/admin/settings', label: 'Attendance rules', icon: BookOpen },
            ].map((a) => (
              <Button key={a.to} variant="outline" className="h-auto justify-start gap-3 py-3" asChild>
                <Link to={a.to}>
                  <a.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm">{a.label}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
