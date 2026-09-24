import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const percentColor = (value, threshold = 75) => {
  if (value >= threshold + 10) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= threshold) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export const percentBadgeVariant = (value, threshold = 75) => {
  if (value >= threshold) return 'success';
  if (value >= threshold - 10) return 'warning';
  return 'destructive';
};

export const statusVariant = (status) => {
  switch (status) {
    case 'PRESENT': return 'success';
    case 'ABSENT': return 'destructive';
    case 'LATE': return 'warning';
    case 'ON_DUTY': return 'info';
    case 'PENDING': return 'warning';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'destructive';
    default: return 'secondary';
  }
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
