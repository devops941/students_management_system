/**
 * Seeds a realistic demo dataset: departments, courses, classes, subjects,
 * faculty, students, parents, timetable and ~6 weeks of attendance history.
 *
 * Usage: npm run seed   (idempotent - clears collections first)
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { refreshShortageAlert } from '../services/attendance.service.js';

const DAY = 24 * 60 * 60 * 1000;
const utcDate = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const PERIODS = [
  { period: 1, startTime: '09:00', endTime: '09:50' },
  { period: 2, startTime: '09:50', endTime: '10:40' },
  { period: 3, startTime: '11:00', endTime: '11:50' },
  { period: 4, startTime: '11:50', endTime: '12:40' },
  { period: 5, startTime: '14:00', endTime: '14:50' },
];

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Aditya', 'Ishita', 'Kabir', 'Meera', 'Rohan', 'Saanvi', 'Arjun', 'Nisha', 'Karthik', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Tanvi', 'Manish', 'Pooja'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Das', 'Mehta', 'Joshi'];

export async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.course.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.department.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
}

export async function seed({ log = console.log } = {}) {
  log('Clearing existing data...');
  await clearDatabase();

  const hash = (pw) => bcrypt.hash(pw, 10);

  /* ---------------- Admin + settings ---------------- */
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@sams.edu',
      password: await hash('Admin@123'),
      role: 'ADMIN',
      phone: '+91-9000000001',
    },
  });

  await prisma.setting.createMany({
    data: [
      { key: 'minAttendancePercent', value: '75' },
      { key: 'academicYear', value: '2025-2026' },
      { key: 'editWindowHours', value: '24' },
      { key: 'institutionName', value: 'SAMS Institute of Technology' },
      { key: 'lowAttendanceSeverity', value: 'MEDIUM' },
      { key: 'enableEmailAlerts', value: 'true' },
      { key: 'enableParentNotifications', value: 'true' },
    ],
  });

  /* ---------------- Departments ---------------- */
  const deptData = [
    { name: 'Computer Science & Engineering', code: 'CSE', hodName: 'Dr. R. Krishnan' },
    { name: 'Electronics & Communication', code: 'ECE', hodName: 'Dr. S. Banerjee' },
    { name: 'Mechanical Engineering', code: 'MECH', hodName: 'Dr. A. Qureshi' },
  ];
  const departments = [];
  for (const d of deptData) departments.push(await prisma.department.create({ data: d }));
  const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));

  /* ---------------- Courses ---------------- */
  const courseDefs = [
    { name: 'B.Tech Computer Science', code: 'BT-CSE', departmentId: deptByCode.CSE.id },
    { name: 'B.Tech Electronics', code: 'BT-ECE', departmentId: deptByCode.ECE.id },
    { name: 'B.Tech Mechanical', code: 'BT-MECH', departmentId: deptByCode.MECH.id },
  ];
  const courses = [];
  for (const c of courseDefs) courses.push(await prisma.course.create({ data: c }));
  const courseByCode = Object.fromEntries(courses.map((c) => [c.code, c]));

  /* ---------------- Classes ---------------- */
  const classDefs = [
    { name: 'CSE-3A', section: 'A', semester: 5, academicYear: '2025-2026', courseId: courseByCode['BT-CSE'].id },
    { name: 'CSE-3B', section: 'B', semester: 5, academicYear: '2025-2026', courseId: courseByCode['BT-CSE'].id },
    { name: 'ECE-3A', section: 'A', semester: 5, academicYear: '2025-2026', courseId: courseByCode['BT-ECE'].id },
    { name: 'MECH-3A', section: 'A', semester: 5, academicYear: '2025-2026', courseId: courseByCode['BT-MECH'].id },
  ];
  const classes = [];
  for (const c of classDefs) classes.push(await prisma.classRoom.create({ data: c }));
  const classByName = Object.fromEntries(classes.map((c) => [c.name, c]));

  /* ---------------- Faculty ---------------- */
  const facultyDefs = [
    { name: 'Dr. Anita Deshpande', email: 'anita.faculty@sams.edu', code: 'FAC-1001', designation: 'Professor', dept: 'CSE' },
    { name: 'Prof. Suresh Kumar', email: 'suresh.faculty@sams.edu', code: 'FAC-1002', designation: 'Associate Professor', dept: 'CSE' },
    { name: 'Dr. Leena Mathew', email: 'leena.faculty@sams.edu', code: 'FAC-1003', designation: 'Assistant Professor', dept: 'CSE' },
    { name: 'Prof. Imran Ali', email: 'imran.faculty@sams.edu', code: 'FAC-1004', designation: 'Professor', dept: 'ECE' },
    { name: 'Dr. Kavitha Rao', email: 'kavitha.faculty@sams.edu', code: 'FAC-1005', designation: 'Associate Professor', dept: 'MECH' },
  ];
  const faculty = [];
  for (const f of facultyDefs) {
    const user = await prisma.user.create({
      data: {
        name: f.name,
        email: f.email,
        password: await hash('Faculty@123'),
        role: 'FACULTY',
        phone: `+91-90${rand(10000000, 99999999)}`,
      },
    });
    faculty.push(
      await prisma.faculty.create({
        data: {
          employeeCode: f.code,
          designation: f.designation,
          departmentId: deptByCode[f.dept].id,
          userId: user.id,
        },
        include: { user: true },
      }),
    );
  }
  const facByCode = Object.fromEntries(faculty.map((f) => [f.employeeCode, f]));

  /* ---------------- Subjects ---------------- */
  const subjectDefs = [
    { name: 'Database Management Systems', code: 'CS501', semester: 5, credits: 4, course: 'BT-CSE', faculty: 'FAC-1001' },
    { name: 'Operating Systems', code: 'CS502', semester: 5, credits: 4, course: 'BT-CSE', faculty: 'FAC-1002' },
    { name: 'Computer Networks', code: 'CS503', semester: 5, credits: 3, course: 'BT-CSE', faculty: 'FAC-1003' },
    { name: 'Software Engineering', code: 'CS504', semester: 5, credits: 3, course: 'BT-CSE', faculty: 'FAC-1001' },
    { name: 'Web Technologies', code: 'CS505', semester: 5, credits: 2, course: 'BT-CSE', faculty: 'FAC-1002' },
    { name: 'Digital Signal Processing', code: 'EC501', semester: 5, credits: 4, course: 'BT-ECE', faculty: 'FAC-1004' },
    { name: 'VLSI Design', code: 'EC502', semester: 5, credits: 3, course: 'BT-ECE', faculty: 'FAC-1004' },
    { name: 'Thermodynamics II', code: 'ME501', semester: 5, credits: 4, course: 'BT-MECH', faculty: 'FAC-1005' },
  ];
  const subjects = [];
  for (const s of subjectDefs) {
    subjects.push(
      await prisma.subject.create({
        data: {
          name: s.name,
          code: s.code,
          semester: s.semester,
          credits: s.credits,
          courseId: courseByCode[s.course].id,
          facultyId: facByCode[s.faculty].id,
        },
      }),
    );
  }
  const subjectByCode = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const cseSubjects = ['CS501', 'CS502', 'CS503', 'CS504', 'CS505'].map((c) => subjectByCode[c]);

  /* ---------------- Students (+ parents) ---------------- */
  const studentPlan = [
    { className: 'CSE-3A', dept: 'CSE', count: 30 },
    { className: 'CSE-3B', dept: 'CSE', count: 20 },
    { className: 'ECE-3A', dept: 'ECE', count: 15 },
    { className: 'MECH-3A', dept: 'MECH', count: 12 },
  ];

  const students = [];
  let rollCounter = 1;
  for (const plan of studentPlan) {
    const klass = classByName[plan.className];
    const dept = deptByCode[plan.dept];
    for (let i = 0; i < plan.count; i += 1) {
      const first = FIRST[(rollCounter + i) % FIRST.length];
      const last = LAST[(rollCounter * 3 + i) % LAST.length];
      const name = `${first} ${last}`;
      const rollNumber = `2023${dept.code}${String(rollCounter).padStart(3, '0')}`;
      const slug = `${first.toLowerCase()}.${last.toLowerCase()}${rollCounter}`;

      const user = await prisma.user.create({
        data: {
          name,
          email: `${slug}@student.sams.edu`,
          password: await hash('Student@123'),
          role: 'STUDENT',
          phone: `+91-8${rand(100000000, 999999999)}`,
        },
      });

      let parentId = null;
      if (rollCounter % 2 === 1) {
        const parentUser = await prisma.user.create({
          data: {
            name: `${last} Guardian`,
            email: `parent.${slug}@sams.edu`,
            password: await hash('Parent@123'),
            role: 'PARENT',
            phone: `+91-7${rand(100000000, 999999999)}`,
          },
        });
        const parent = await prisma.parent.create({
          data: { relation: 'Father', occupation: pick(['Engineer', 'Business', 'Doctor', 'Teacher']), userId: parentUser.id },
        });
        parentId = parent.id;
      }

      students.push(
        await prisma.student.create({
          data: {
            rollNumber,
            admissionYear: 2023,
            guardianName: `${last} Guardian`,
            guardianPhone: `+91-7${rand(100000000, 999999999)}`,
            userId: user.id,
            classId: klass.id,
            departmentId: dept.id,
            parentId,
          },
        }),
      );
      rollCounter += 1;
    }
  }

  /* ---------------- Timetable ---------------- */
  for (const className of ['CSE-3A', 'CSE-3B']) {
    const klass = classByName[className];
    for (let day = 1; day <= 5; day += 1) {
      for (let p = 0; p < PERIODS.length; p += 1) {
        const subject = cseSubjects[(day + p) % cseSubjects.length];
        await prisma.timetable.create({
          data: {
            dayOfWeek: day,
            period: PERIODS[p].period,
            startTime: PERIODS[p].startTime,
            endTime: PERIODS[p].endTime,
            room: `${className}-R${p + 1}`,
            classId: klass.id,
            subjectId: subject.id,
            facultyId: subject.facultyId,
          },
        });
      }
    }
  }
  for (const [className, codes, facultyCode] of [
    ['ECE-3A', ['EC501', 'EC502'], 'FAC-1004'],
    ['MECH-3A', ['ME501'], 'FAC-1005'],
  ]) {
    const klass = classByName[className];
    for (let day = 1; day <= 5; day += 1) {
      for (let p = 0; p < 3; p += 1) {
        const subject = subjectByCode[codes[(day + p) % codes.length]];
        await prisma.timetable.create({
          data: {
            dayOfWeek: day,
            period: PERIODS[p].period,
            startTime: PERIODS[p].startTime,
            endTime: PERIODS[p].endTime,
            room: `${className}-R${p + 1}`,
            classId: klass.id,
            subjectId: subject.id,
            facultyId: facByCode[facultyCode].id,
          },
        });
      }
    }
  }

  /* ---------------- Attendance history (~2 weeks) ---------------- */
  log('Generating attendance history...');
  const today = utcDate(new Date());
  const start = new Date(today.getTime() - 14 * DAY);
  const shortageStudents = new Set(students.filter((_, i) => i % 11 === 0).map((s) => s.id));
  const facultyUserId = Object.fromEntries(faculty.map((f) => [f.id, f.userId]));

  const attendanceBatch = [];
  for (const student of students) {
    const klass = classes.find((c) => c.id === student.classId);
    const classSubjects = klass.name.startsWith('CSE')
      ? cseSubjects
      : subjects.filter((s) => s.courseId === klass.courseId);
    const base = shortageStudents.has(student.id) ? 0.55 : 0.82 + Math.random() * 0.15;

    for (let d = new Date(start); d <= today; d = new Date(d.getTime() + DAY)) {
      const day = utcDate(d);
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) continue;

      for (let sIdx = 0; sIdx < classSubjects.length; sIdx += 1) {
        const subject = classSubjects[sIdx];
        const roll = Math.random();
        let status = 'PRESENT';
        if (roll > base) status = 'ABSENT';
        else if (roll > base - 0.08) status = 'LATE';
        else if (roll > base - 0.13) status = 'ON_DUTY';

        attendanceBatch.push({
          date: day,
          period: PERIODS[sIdx % PERIODS.length].period,
          status,
          studentId: student.id,
          classId: klass.id,
          subjectId: subject.id,
          facultyId: subject.facultyId,
          markedById: facultyUserId[subject.facultyId],
        });
      }
    }
  }

  if (attendanceBatch.length > 0) {
    await prisma.attendance.createMany({ data: attendanceBatch });
  }
  let attendanceCount = attendanceBatch.length;

  /* ---------------- Leave requests ---------------- */
  const sampleStudents = students.slice(0, 8);
  const leaveStates = ['PENDING', 'PENDING', 'APPROVED', 'REJECTED', 'PENDING', 'APPROVED', 'PENDING', 'REJECTED'];
  for (const [i, student] of sampleStudents.entries()) {
    const from = new Date(today.getTime() + (i + 1) * DAY);
    const to = new Date(from.getTime() + rand(1, 3) * DAY);
    await prisma.leaveRequest.create({
      data: {
        fromDate: utcDate(from),
        toDate: utcDate(to),
        reason: pick([
          'Medical leave - fever and cold',
          'Family function out of station',
          'Inter-college sports tournament',
          'Hackathon participation (on duty)',
          'Personal emergency',
        ]),
        type: i % 3 === 0 ? 'ON_DUTY' : 'LEAVE',
        status: leaveStates[i],
        studentId: student.id,
        approvedById: ['APPROVED', 'REJECTED'].includes(leaveStates[i]) ? admin.id : null,
        approvedAt: ['APPROVED', 'REJECTED'].includes(leaveStates[i]) ? new Date() : null,
        approverRemarks: leaveStates[i] === 'REJECTED' ? 'Insufficient reason provided' : null,
      },
    });
  }

  /* ---------------- Shortage alerts ---------------- */
  for (const studentId of shortageStudents) {
    await refreshShortageAlert(studentId);
  }

  const summary = {
    admin: admin.email,
    departments: departments.length,
    courses: courses.length,
    classes: classes.length,
    subjects: subjects.length,
    faculty: faculty.length,
    students: students.length,
    attendanceRecords: attendanceCount,
    shortageAlerts: shortageStudents.size,
  };
  log('Seed complete:', summary);
  return summary;
}

const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  seed()
    .then(() => prisma.$disconnect())
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('Seed failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export default seed;
