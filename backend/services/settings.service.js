import env from '../config/env.js';
import { prisma } from '../config/prisma.js';

export const SETTING_DEFAULTS = {
  minAttendancePercent: String(env.minAttendancePercent),
  editWindowHours: String(env.editWindowHours),
  academicYear: '2025-2026',
  institutionName: 'SAMS Institute of Technology',
  lowAttendanceSeverity: 'MEDIUM',
  enableEmailAlerts: 'true',
  enableParentNotifications: 'true',
};

/** Reads all settings as a flat object, falling back to defaults per key. */
export async function readSettings() {
  const rows = await prisma.setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...SETTING_DEFAULTS, ...stored };
}

const asBool = (v) => v === true || v === 'true' || v === '1';

/**
 * Effective runtime rules. Reading these from one place keeps controllers
 * consistent with whatever the admin saved in Settings.
 */
export async function getSettings() {
  const s = await readSettings();
  return {
    raw: s,
    minAttendancePercent: Number(s.minAttendancePercent) || env.minAttendancePercent,
    editWindowHours: Number(s.editWindowHours) || env.editWindowHours,
    academicYear: s.academicYear,
    institutionName: s.institutionName,
    lowAttendanceSeverity: s.lowAttendanceSeverity || 'MEDIUM',
    enableEmailAlerts: asBool(s.enableEmailAlerts),
    enableParentNotifications: asBool(s.enableParentNotifications),
  };
}

/** Severity scales with how far below the threshold a student has fallen. */
export function severityFor(percentage, threshold, configured = null) {
  const gap = threshold - percentage;
  if (configured && configured !== 'MEDIUM') return configured;
  if (gap >= 15) return 'HIGH';
  if (gap >= 5) return 'MEDIUM';
  return 'LOW';
}

export default { readSettings, getSettings, severityFor, SETTING_DEFAULTS };
