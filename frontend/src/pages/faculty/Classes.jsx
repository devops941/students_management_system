import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { School, Users, ClipboardCheck, BookOpen, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState, StatCard } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function FacultyClassesPage() {
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    api.get('/faculty/me/assignments').then(setData).catch((e) => toast.error(e.message));
  }, []);

  const openClass = async (klass) => {
    setDetail(klass);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/classes/${klass.id}/students`);
      setStudents(res);
    } catch (err) {
      toast.error(err.message);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (!data) {
    return (
      <div>
        <PageHeader title="My Classes" description="The classes you teach, with their rosters." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Classes" description="The classes you teach, with their rosters." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Classes" value={data.classes.length} icon={School} />
        <StatCard label="Subjects" value={data.subjects.length} icon={BookOpen} />
        <StatCard label="Weekly periods" value={data.timetable.length} icon={ClipboardCheck} />
      </div>

      {data.classes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="No classes assigned" description="Ask the administrator to add you to a timetable." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.classes.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {c.name}-{c.section}
                  <Badge variant="outline">Sem {c.semester}</Badge>
                </CardTitle>
                <CardDescription>{c.academicYear}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openClass(c)}>
                  <Users className="h-4 w-4" /> View roster
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/faculty/mark-attendance?classId=${c.id}`}>
                    Mark attendance
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Roster · {detail?.name}-{detail?.section}</DialogTitle>
            <DialogDescription>{students.length} enrolled student(s)</DialogDescription>
          </DialogHeader>
          {loadingStudents ? (
            <Skeleton className="h-40" />
          ) : students.length === 0 ? (
            <EmptyState title="No students enrolled" />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll no</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Guardian phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.rollNumber}</TableCell>
                      <TableCell className="font-medium">{s.user?.name}</TableCell>
                      <TableCell className="text-xs">{s.user?.email}</TableCell>
                      <TableCell className="text-xs">{s.guardianPhone || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
