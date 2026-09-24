import { useEffect, useRef, useState } from 'react';
import {
  Download, FileSpreadsheet, FileText, CalendarDays, BookOpen, Users, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { toast } from 'sonner';
import api, { downloadReport } from '@/lib/api';
import { PageHeader, EmptyState, TableSkeleton, StatCard } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { loadClassOptions } from '@/lib/options';
import { formatDate } from '@/lib/utils';

function ExportButtons({ type, filters = {} }) {
  const [busy, setBusy] = useState(null);
  const run = async (format) => {
    setBusy(format);
    try {
      await downloadReport({ type, format, ...filters });
      toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} downloaded`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => run('excel')} disabled={busy === 'excel'}>
        <FileSpreadsheet className="h-4 w-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => run('pdf')} disabled={busy === 'pdf'}>
        <FileText className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}

export default function ReportsPage() {
  const [classOptions, setClassOptions] = useState([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [daily, setDaily] = useState(null);
  const [subjectWise, setSubjectWise] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [classReport, setClassReport] = useState(null);
  const [tab, setTab] = useState('daily');
  // Guards against a slow earlier request overwriting a newer result.
  const requestId = useRef(0);

  useEffect(() => {
    loadClassOptions()
      .then((c) => {
        setClassOptions(c);
        if (c[0]) setClassId(c[0].value);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const filters = { classId: classId || undefined, from: from || undefined, to: to || undefined };

  const loadTab = async (which) => {
    const id = ++requestId.current;
    try {
      let data = null;
      if (which === 'daily') data = await api.get('/reports/daily', filters);
      if (which === 'subject') data = await api.get('/reports/subject-wise', filters);
      if (which === 'monthly') data = await api.get('/reports/monthly', filters);
      if (which === 'class' && classId) data = await api.get('/reports/class', { classId });
      if (id !== requestId.current) return;
      if (which === 'daily') setDaily(data);
      if (which === 'subject') setSubjectWise(data);
      if (which === 'monthly') setMonthly(data);
      if (which === 'class') setClassReport(data);
    } catch (err) {
      if (id === requestId.current) toast.error(err.message);
    }
  };

  useEffect(() => {
    loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, classId, from, to]);

  const avg = (rows) =>
    rows && rows.length
      ? Math.round((rows.reduce((s, r) => s + r.percentage, 0) / rows.length) * 100) / 100
      : null;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Daily, subject-wise, monthly and class-wise analysis with Excel and PDF export."
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase text-muted-foreground">Class</label>
            <Select value={classId || 'all'} onValueChange={(v) => setClassId(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setFrom(''); setTo(''); }}
            >
              Clear dates
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily"><CalendarDays className="mr-1 h-4 w-4" /> Daily</TabsTrigger>
          <TabsTrigger value="subject"><BookOpen className="mr-1 h-4 w-4" /> Subject-wise</TabsTrigger>
          <TabsTrigger value="monthly"><BarChart3 className="mr-1 h-4 w-4" /> Monthly</TabsTrigger>
          <TabsTrigger value="class"><Users className="mr-1 h-4 w-4" /> Class ranking</TabsTrigger>
        </TabsList>

        {/* DAILY */}
        <TabsContent value="daily">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Days reported" value={daily?.length ?? '—'} icon={CalendarDays} />
            <StatCard label="Average attendance" value={avg(daily) !== null ? `${avg(daily)}%` : '—'} tone="success" />
            <StatCard label="Range" value={from || to ? `${from || 'start'} → ${to || 'today'}` : 'All time'} />
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Daily attendance</CardTitle>
                <CardDescription>Overall percentage for each day with recorded sessions.</CardDescription>
              </div>
              <ExportButtons type="daily" filters={filters} />
            </CardHeader>
            <CardContent>
              {!daily ? (
                <TableSkeleton />
              ) : daily.length === 0 ? (
                <EmptyState title="No data for this range" description="Try widening the date range or clearing filters." />
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={daily}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={formatDate} formatter={(v) => [`${v}%`, 'Attendance']} />
                        <Line type="monotone" dataKey="percentage" stroke="hsl(221 83% 53%)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>On duty</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {daily.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell>{formatDate(d.date)}</TableCell>
                            <TableCell>{d.present}</TableCell>
                            <TableCell>{d.absent}</TableCell>
                            <TableCell>{d.late}</TableCell>
                            <TableCell>{d.onDuty}</TableCell>
                            <TableCell>{d.total}</TableCell>
                            <TableCell>
                              <Badge variant={d.percentage >= 75 ? 'success' : 'destructive'}>{d.percentage}%</Badge>
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
        </TabsContent>

        {/* SUBJECT-WISE */}
        <TabsContent value="subject">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Subject-wise attendance</CardTitle>
                <CardDescription>Compare how students are performing across subjects.</CardDescription>
              </div>
              <ExportButtons type="subject-wise" filters={filters} />
            </CardHeader>
            <CardContent>
              {!subjectWise ? (
                <TableSkeleton />
              ) : subjectWise.length === 0 ? (
                <EmptyState title="No data for this range" />
              ) : (
                <>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectWise}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                        <Legend />
                        <Bar dataKey="percentage" name="Attendance %" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
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
                        {subjectWise.map((s) => (
                          <TableRow key={s.subjectId}>
                            <TableCell className="font-medium">{s.subject}</TableCell>
                            <TableCell>{s.present}</TableCell>
                            <TableCell>{s.absent}</TableCell>
                            <TableCell>{s.late}</TableCell>
                            <TableCell>{s.total}</TableCell>
                            <TableCell>
                              <Badge variant={s.percentage >= 75 ? 'success' : 'destructive'}>{s.percentage}%</Badge>
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
        </TabsContent>

        {/* MONTHLY */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Monthly trend</CardTitle>
                <CardDescription>Attendance percentage aggregated per month.</CardDescription>
              </div>
              <ExportButtons type="monthly" filters={filters} />
            </CardHeader>
            <CardContent>
              {!monthly ? (
                <TableSkeleton />
              ) : monthly.length === 0 ? (
                <EmptyState title="No monthly data" />
              ) : (
                <>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                        <Bar dataKey="percentage" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Total records</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthly.map((m) => (
                        <TableRow key={m.month}>
                          <TableCell>{m.month}</TableCell>
                          <TableCell>{m.total}</TableCell>
                          <TableCell>{m.present}</TableCell>
                          <TableCell><Badge variant={m.percentage >= 75 ? 'success' : 'destructive'}>{m.percentage}%</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLASS RANKING */}
        <TabsContent value="class">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Class ranking</CardTitle>
                <CardDescription>Every student in the selected class, ranked by attendance.</CardDescription>
              </div>
              <ExportButtons type="class" filters={{ classId }} />
            </CardHeader>
            <CardContent>
              {!classReport ? (
                <TableSkeleton />
              ) : classReport.length === 0 ? (
                <EmptyState title="Select a class" description="Choose a class to see its students ranked." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Roll no</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...classReport]
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((s, i) => (
                        <TableRow key={s.studentId}>
                          <TableCell className="font-semibold">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{s.rollNumber}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.present}</TableCell>
                          <TableCell>{s.absent}</TableCell>
                          <TableCell>{s.total}</TableCell>
                          <TableCell>
                            <Badge variant={s.percentage >= 75 ? 'success' : 'destructive'}>{s.percentage}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
