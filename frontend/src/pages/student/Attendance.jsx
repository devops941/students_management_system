import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, TrendingUp, AlertTriangle, CheckCircle2, FileText,
  BookOpen, CalendarDays,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, StatCard, AttendanceProgress, EmptyState } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { statusVariant, formatDate } from '@/lib/utils';

const STATUS_COLORS = {
  PRESENT: '#10b981',
  LATE: '#f59e0b',
  ON_DUTY: '#0ea5e9',
  ABSENT: '#ef4444',
};

export default function StudentAttendancePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/students/me/attendance').then(setData).catch((e) => setError(e.message));
  }, []);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Present', value: data.overall.present, key: 'PRESENT' },
      { name: 'Late', value: data.overall.late, key: 'LATE' },
      { name: 'On duty', value: data.overall.onDuty, key: 'ON_DUTY' },
      { name: 'Absent', value: data.overall.absent, key: 'ABSENT' },
    ].filter((d) => d.value > 0);
  }, [data]);

  if (error) {
    return (
      <div>
        <PageHeader title="My Attendance" />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load attendance</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="My Attendance" description="Your attendance record, subject by subject." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const { overall, subjects, student, records, threshold, eligible } = data;
  const weakSubjects = subjects.filter((s) => s.percentage < threshold);

  return (
    <div>
      <PageHeader
        title="My Attendance"
        description={`${student.rollNumber} · ${student.class?.name}-${student.class?.section} · minimum requirement ${threshold}%`}
      >
        <Button variant="outline" asChild>
          <Link to="/student/leaves"><FileText className="h-4 w-4" /> Apply for leave</Link>
        </Button>
      </PageHeader>

      {!eligible && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attendance below the minimum requirement</AlertTitle>
          <AlertDescription>
            You are at {overall.percentage}%, below the required {threshold}%. You may be barred from exams.
            Speak to your mentor and apply for leave for any missed days.
          </AlertDescription>
        </Alert>
      )}

      {eligible && (!weakSubjects.length ? (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>You meet the attendance requirement</AlertTitle>
          <AlertDescription>
            Overall {overall.percentage}% — above the {threshold}% minimum. Keep it up.
          </AlertDescription>
        </Alert>
      ) : null)}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall attendance" value={`${overall.percentage}%`} icon={TrendingUp} tone={eligible ? 'success' : 'destructive'} />
        <StatCard label="Periods present" value={overall.present} icon={CheckCircle2} tone="success" />
        <StatCard label="Periods absent" value={overall.absent} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Total periods" value={overall.total} icon={CalendarCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance breakdown</CardTitle>
            <CardDescription>Across all subjects and periods.</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                        {pieData.map((e) => <Cell key={e.key} fill={STATUS_COLORS[e.key]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <AttendanceProgress percentage={overall.percentage} threshold={threshold} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Subject-wise attendance
            </CardTitle>
            <CardDescription>Subjects below {threshold}% are highlighted.</CardDescription>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <EmptyState title="No subject data" description="Attendance will appear once your teachers start marking." />
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjects} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="code" width={70} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                      <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                        {subjects.map((s) => (
                          <Cell key={s.subjectId} fill={s.percentage >= threshold ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((s) => (
                        <TableRow key={s.subjectId}>
                          <TableCell>
                            <p className="font-medium">{s.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{s.code}</p>
                          </TableCell>
                          <TableCell>{s.present}</TableCell>
                          <TableCell>{s.absent}</TableCell>
                          <TableCell>{s.late}</TableCell>
                          <TableCell>{s.total}</TableCell>
                          <TableCell>
                            <Badge variant={s.percentage >= threshold ? 'success' : 'destructive'}>
                              {s.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> My attendance history
          </CardTitle>
          <CardDescription>Your most recent marked periods.</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState title="No history yet" />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 100).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-sm">{r.subject?.name}</TableCell>
                      <TableCell>{r.period ?? '—'}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.remarks || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
