import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle2, CalendarDays, Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, StatCard, AttendanceProgress, EmptyState } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function ParentDashboard() {
  const [wards, setWards] = useState(null);
  const [tab, setTab] = useState('');

  useEffect(() => {
    api.get('/parent/wards')
      .then((data) => {
        setWards(data);
        if (data[0]) setTab(data[0].student.id);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  if (!wards) {
    return (
      <div>
        <PageHeader title="Ward Attendance" description="Monitor your child's attendance." />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div>
        <PageHeader title="Ward Attendance" />
        <Card><CardContent><EmptyState title="No wards linked" description="Contact the administration to link your child's account." icon={Users} /></CardContent></Card>
      </div>
    );
  }

  const belowThreshold = wards.filter((w) => !w.summary.eligible).length;
  const avg = Math.round(
    (wards.reduce((s, w) => s + w.summary.overall.percentage, 0) / wards.length) * 100,
  ) / 100;

  return (
    <div>
      <PageHeader
        title="Ward Attendance"
        description={`Monitoring ${wards.length} ward(s). You are alerted when attendance drops below the minimum.`}
      >
        <Button variant="outline" asChild>
          <Link to="/student/alerts"><Bell className="h-4 w-4" /> Alerts</Link>
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Wards" value={wards.length} icon={Users} />
        <StatCard label="Average attendance" value={`${avg}%`} icon={TrendingUp} tone={belowThreshold ? 'warning' : 'success'} />
        <StatCard label="Below minimum" value={belowThreshold} icon={AlertTriangle} tone={belowThreshold ? 'destructive' : 'default'} />
      </div>

      {wards.length > 1 && (
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="flex-wrap">
            {wards.map((w) => (
              <TabsTrigger key={w.student.id} value={w.student.id}>
                {w.student.user?.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {wards.filter((w) => (wards.length > 1 ? w.student.id === tab : true)).map(({ student, summary }) => (
        <div key={student.id} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{student.user?.name}</span>
                <Badge variant={summary.eligible ? 'success' : 'destructive'}>
                  {summary.overall.percentage}%
                </Badge>
              </CardTitle>
              <CardDescription>
                {student.rollNumber} · {student.class?.name}-{student.class?.section}
                {student.department ? ` · ${student.department.code}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AttendanceProgress percentage={summary.overall.percentage} threshold={summary.threshold} />
              {!summary.eligible && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Attendance is below the required {summary.threshold}%. Please discuss with the class
                    mentor to avoid exam eligibility issues.
                  </p>
                </div>
              )}
              {summary.eligible && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Meets the {summary.threshold}% attendance requirement.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Present" value={summary.overall.present} tone="success" />
            <StatCard label="Absent" value={summary.overall.absent} tone="destructive" />
            <StatCard label="Late" value={summary.overall.late} tone="warning" />
            <StatCard label="Total periods" value={summary.overall.total} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Subject-wise performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.subjects.length === 0 ? (
                <EmptyState title="No attendance data yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.subjects.map((s) => (
                      <TableRow key={s.subjectId}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{s.code}</p>
                        </TableCell>
                        <TableCell>{s.present}</TableCell>
                        <TableCell>{s.absent}</TableCell>
                        <TableCell>{s.total}</TableCell>
                        <TableCell>
                          <Badge variant={s.percentage >= summary.threshold ? 'success' : 'destructive'}>
                            {s.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
