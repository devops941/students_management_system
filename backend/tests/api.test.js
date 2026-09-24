/**
 * End-to-end API integration test against a running server + seeded DB.
 * Run: BASE_URL=http://localhost:4000 npm test
 */
const BASE = process.env.BASE_URL || 'http://localhost:4000';

let passed = 0;
let failed = 0;

const results = [];

async function req(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = raw || !contentType.includes('json') ? await res.arrayBuffer() : await res.json();
  return { status: res.status, data, headers: res.headers };
}

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    results.push(`  PASS  ${name}`);
  } else {
    failed += 1;
    results.push(`  FAIL  ${name} ${extra}`);
  }
}

async function group(title, fn) {
  results.push(`\n${title}`);
  try {
    await fn();
  } catch (err) {
    failed += 1;
    results.push(`  FAIL  ${title} threw: ${err.message}`);
  }
}

(async () => {
  let adminToken;
  let facultyToken;
  let studentToken;
  let parentToken;
  let classId;
  let subjectId;
  let studentId;

  await group('Auth', async () => {
    const bad = await req('POST', '/api/auth/login', { body: { email: 'admin@sams.edu', password: 'wrong' } });
    check('rejects wrong password', bad.status === 401, `got ${bad.status}`);

    const admin = await req('POST', '/api/auth/login', { body: { email: 'admin@sams.edu', password: 'Admin@123' } });
    check('admin can log in', admin.status === 200 && admin.data.data.token, JSON.stringify(admin.data));
    adminToken = admin.data.data?.token;
    check('login returns role', admin.data.data?.user?.role === 'ADMIN');

    const faculty = await req('POST', '/api/auth/login', { body: { email: 'anita.faculty@sams.edu', password: 'Faculty@123' } });
    check('faculty can log in', faculty.status === 200 && faculty.data.data.token);
    facultyToken = faculty.data.data?.token;

    const students = await req('GET', '/api/students?limit=1', { token: adminToken });
    check('admin lists students', students.status === 200 && students.data.data.total > 0, JSON.stringify(students.data).slice(0, 200));
    studentId = students.data.data?.items?.[0]?.id;
    classId = students.data.data?.items?.[0]?.class?.id;

    const me = await req('GET', '/api/auth/me', { token: adminToken });
    check('me returns profile', me.status === 200 && me.data.data.email === 'admin@sams.edu');

    const noToken = await req('GET', '/api/students');
    check('rejects unauthenticated request', noToken.status === 401);
  });

  await group('Role authorisation', async () => {
    const students = await req('GET', '/api/students?limit=1', { token: facultyToken });
    const firstStudentUserEmail = students.data.data?.items?.[0]?.user?.email;
    const stu = await req('POST', '/api/auth/login', { body: { email: firstStudentUserEmail, password: 'Student@123' } });
    check('student can log in', stu.status === 200 && stu.data.data.token, JSON.stringify(stu.data).slice(0, 150));
    studentToken = stu.data.data?.token;

    const forbidden = await req('GET', '/api/users', { token: facultyToken });
    check('faculty cannot list users', forbidden.status === 403, `got ${forbidden.status}`);

    const studentForbidden = await req('POST', '/api/departments', {
      token: studentToken,
      body: { name: 'Hack', code: 'HCK' },
    });
    check('student cannot create department', studentForbidden.status === 403, `got ${studentForbidden.status}`);
  });

  await group('Academic structure', async () => {
    const depts = await req('GET', '/api/departments', { token: adminToken });
    check('lists departments', depts.status === 200 && depts.data.data.total === 3);

    const courses = await req('GET', '/api/courses', { token: adminToken });
    check('lists courses', courses.status === 200 && courses.data.data.total === 3);

    const classes = await req('GET', '/api/classes', { token: adminToken });
    check('lists classes', classes.status === 200 && classes.data.data.total === 4);

    const subjects = await req('GET', '/api/subjects', { token: adminToken });
    check('lists subjects', subjects.status === 200 && subjects.data.data.total === 8);
    subjectId = subjects.data.data?.items?.find((s) => s.code === 'CS501')?.id;

    const tt = await req('GET', `/api/timetable?classId=${classId}`, { token: adminToken });
    check('lists timetable for class', tt.status === 200 && tt.data.data.total > 0);
  });

  await group('Dashboard', async () => {
    const dash = await req('GET', '/api/dashboard/admin', { token: adminToken });
    check('admin dashboard loads', dash.status === 200, JSON.stringify(dash.data).slice(0, 200));
    check('dashboard reports student count', dash.data.data?.counts?.students > 50);
    check('dashboard has 14-day trend', Array.isArray(dash.data.data?.trend));

    const fDash = await req('GET', '/api/dashboard/faculty', { token: facultyToken });
    check('faculty dashboard loads', fDash.status === 200 && Array.isArray(fDash.data.data?.subjects));
  });

  await group('Attendance marking', async () => {
    const roster = await req('GET', `/api/attendance/session?classId=${classId}&subjectId=${subjectId}&date=2026-09-24`, { token: facultyToken });
    check('faculty gets session roster', roster.status === 200 && roster.data.data.length > 0, JSON.stringify(roster.data).slice(0, 200));

    const records = roster.data.data.slice(0, 5).map((r, i) => ({
      studentId: r.studentId,
      status: i % 5 === 0 ? 'ABSENT' : 'PRESENT',
      remarks: 'integration test',
    }));
    const marked = await req('POST', '/api/attendance/mark', {
      token: facultyToken,
      body: { classId, subjectId, date: '2026-09-24', period: 1, records },
    });
    check('faculty marks attendance', marked.status === 201 && marked.data.data.saved === records.length, JSON.stringify(marked.data).slice(0, 250));

    const roster2 = await req('GET', `/api/attendance/session?classId=${classId}&subjectId=${subjectId}&date=2026-09-24&period=1`, { token: facultyToken });
    const persisted = roster2.data.data.filter((r) => r.status);
    check('attendance persisted', persisted.length >= records.length);

    const summary = await req('GET', `/api/attendance/student/${studentId}/summary`, { token: adminToken });
    check('student summary computed', summary.status === 200 && typeof summary.data.data.overall.percentage === 'number', JSON.stringify(summary.data).slice(0, 200));
    check('subject-wise breakdown present', Array.isArray(summary.data.data?.subjects) && summary.data.data.subjects.length > 0);
  });

  await group('Leave & on-duty workflow', async () => {
    const apply = await req('POST', '/api/leaves', {
      token: studentToken,
      body: {
        fromDate: '2026-09-25',
        toDate: '2026-09-26',
        reason: 'Integration test medical leave',
        type: 'LEAVE',
      },
    });
    check('student applies for leave', apply.status === 201 && apply.data.data.status === 'PENDING', JSON.stringify(apply.data).slice(0, 200));
    const leaveId = apply.data.data?.id;

    const mine = await req('GET', '/api/leaves', { token: studentToken });
    check('student sees own leave', mine.status === 200 && mine.data.data.items.length >= 1);

    const decide = await req('PATCH', `/api/leaves/${leaveId}/decide`, {
      token: adminToken,
      body: { status: 'APPROVED', approverRemarks: 'Approved by test' },
    });
    check('admin approves leave', decide.status === 200 && decide.data.data.status === 'APPROVED', JSON.stringify(decide.data).slice(0, 200));

    const reDecide = await req('PATCH', `/api/leaves/${leaveId}/decide`, {
      token: adminToken,
      body: { status: 'REJECTED' },
    });
    check('cannot re-decide a decided leave', reDecide.status === 400, `got ${reDecide.status}`);

    const pending = await req('GET', '/api/leaves/pending-count', { token: adminToken });
    check('pending count endpoint works', pending.status === 200);
  });

  await group('Alerts & defaulters', async () => {
    const defaulters = await req('GET', '/api/attendance/defaulters?threshold=90', { token: adminToken });
    check('defaulters report works', defaulters.status === 200 && Array.isArray(defaulters.data.data.items));
    check('defaulter rows have percentage', defaulters.data.data.items.every((r) => typeof r.percentage === 'number'));

    const alerts = await req('GET', '/api/alerts?status=OPEN', { token: adminToken });
    check('admin lists open alerts', alerts.status === 200 && alerts.data.data.total > 0);
    check('alerts carry a severity', alerts.data.data.items.every((a) => ['LOW', 'MEDIUM', 'HIGH'].includes(a.severity)));
    check('alerts carry a status', alerts.data.data.items.every((a) => a.status === 'OPEN'));

    const scan = await req('POST', '/api/alerts/regenerate', { token: adminToken });
    check('admin can rescan alerts', scan.status === 200 && typeof scan.data.data.created === 'number', JSON.stringify(scan.data).slice(0, 150));

    const notify = await req('POST', '/api/alerts/notify', { token: adminToken });
    check('admin can notify guardians', notify.status === 200 && typeof notify.data.data.notified === 'number');

    const open = (await req('GET', '/api/alerts?status=OPEN', { token: adminToken })).data.data.items;
    if (open[0]) {
      const resolved = await req('PATCH', `/api/alerts/${open[0].id}/resolve`, { token: adminToken });
      check('admin can resolve an alert', resolved.status === 200 && resolved.data.data.status === 'RESOLVED');
      await req('POST', '/api/alerts/regenerate', { token: adminToken });
    }

    const mine = await req('GET', '/api/alerts/mine', { token: studentToken });
    check('student lists own alerts', mine.status === 200 && Array.isArray(mine.data.data));

    const forbidden = await req('POST', '/api/alerts/regenerate', { token: studentToken });
    check('student cannot trigger a scan', forbidden.status === 403);
  });

  await group('Reports & export', async () => {
    const daily = await req('GET', '/api/reports/daily', { token: adminToken });
    check('daily report works', daily.status === 200);

    const subjectWise = await req('GET', '/api/reports/subject-wise', { token: adminToken });
    check('subject-wise report works', subjectWise.status === 200 && subjectWise.data.data.length > 0);

    const monthly = await req('GET', '/api/reports/monthly', { token: adminToken });
    check('monthly report works', monthly.status === 200);

    const classReport = await req('GET', `/api/reports/class?classId=${classId}`, { token: adminToken });
    check('class report works', classReport.status === 200 && classReport.data.data.length > 0);

    const xlsx = await req('GET', '/api/reports/export?type=defaulters&format=excel', { token: adminToken, raw: true });
    check('Excel export returns a file', xlsx.status === 200 && xlsx.data.byteLength > 1000, `bytes=${xlsx.data.byteLength}`);

    const pdf = await req('GET', '/api/reports/export?type=daily&format=pdf', { token: adminToken, raw: true });
    check('PDF export returns a file', pdf.status === 200 && pdf.data.byteLength > 500, `bytes=${pdf.data.byteLength}`);

    const aliased = await req('GET', '/api/reports/export?type=subject-wise&format=excel', { token: adminToken, raw: true });
    check('subject-wise export alias works', aliased.status === 200 && aliased.data.byteLength > 1000);
  });

  await group('Dashboard depth', async () => {
    const dash = await req('GET', '/api/dashboard/admin', { token: adminToken });
    check('admin dashboard exposes counts', dash.data.data.counts.students > 0 && dash.data.data.counts.subjects > 0);
    check('admin dashboard reports open alerts', typeof dash.data.data.counts.openAlerts === 'number');

    const fDash = await req('GET', '/api/dashboard/faculty', { token: facultyToken });
    const d = fDash.data.data;
    check('faculty dashboard exposes faculty profile', d.faculty?.employeeCode === 'FAC-1001', JSON.stringify(d.faculty));
    check('faculty dashboard has workload counts', d.counts.subjects > 0 && d.counts.students > 0);
    check('faculty subjects include average percentage', d.subjects.every((s) => typeof s.averagePercentage === 'number'));
    check('faculty dashboard has a weekly schedule array', Array.isArray(d.todaysSchedule));
    check('faculty dashboard has recent sessions', Array.isArray(d.recentSessions));
  });

  await group('Users, audit, settings', async () => {
    const users = await req('GET', '/api/users?role=FACULTY', { token: adminToken });
    check('lists faculty users', users.status === 200 && users.data.data.total === 5);

    const logs = await req('GET', '/api/audit-logs', { token: adminToken });
    check('audit log records actions', logs.status === 200 && logs.data.data.total > 0, `total=${logs.data.data?.total}`);
    check('audit entries expose actor role', logs.data.data.items.every((l) => typeof l.actorRole === 'string'));
    check('audit entries expose a description', logs.data.data.items.every((l) => typeof l.description === 'string'));

    const settings = await req('GET', '/api/settings', { token: adminToken });
    check('settings load', settings.status === 200 && settings.data.data.minAttendancePercent === 75);
    check('settings expose notification flags', settings.data.data.enableEmailAlerts === true);

    const updated = await req('PUT', '/api/settings', { token: adminToken, body: { minAttendancePercent: 80, lowAttendanceSeverity: 'HIGH' } });
    check('admin updates settings', updated.status === 200 && updated.data.data.minAttendancePercent === 80);
    check('admin updates severity', updated.data.data.lowAttendanceSeverity === 'HIGH');

    // The new threshold must actually drive the defaulter list.
    const defaulters80 = await req('GET', '/api/attendance/defaulters', { token: adminToken });
    check('new threshold drives defaulters', defaulters80.data.data.threshold === 80);

    await req('PUT', '/api/settings', { token: adminToken, body: { minAttendancePercent: 75, lowAttendanceSeverity: 'MEDIUM' } });
  });

  await group('Security checks', async () => {
    const injection = await req('POST', '/api/auth/login', {
      body: { email: { $ne: null }, password: { $ne: null } },
    });
    check('NoSQL injection in login is rejected', injection.status === 401 || injection.status === 400, `got ${injection.status}`);

    const tamper = await req('POST', '/api/attendance/mark', {
      token: studentToken,
      body: { classId, subjectId, date: '2026-09-24', period: 2, records: [{ studentId, status: 'PRESENT' }] },
    });
    check('student cannot mark attendance', tamper.status === 403, `got ${tamper.status}`);
  });

  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
