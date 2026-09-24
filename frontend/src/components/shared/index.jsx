import { cn, percentBadgeVariant } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Inbox } from 'lucide-react';

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'default' }) {
  const tones = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    destructive: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {Icon && (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceBadge({ percentage, threshold = 75 }) {
  return (
    <Badge variant={percentBadgeVariant(percentage, threshold)}>{percentage}%</Badge>
  );
}

export function AttendanceProgress({ percentage, threshold = 75 }) {
  const tone = percentage >= threshold ? 'success' : percentage >= threshold - 10 ? 'warning' : 'destructive';
  return (
    <div className="w-full space-y-1">
      <Progress value={percentage} tone={tone} />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{percentage}%</span>
        <span>min {threshold}%</span>
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <p className="font-medium">Could not load data</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Pagination({ page, pages, total, onPageChange, limit }) {
  if (!pages || pages <= 1) {
    return total ? <p className="text-xs text-muted-foreground">{total} record(s)</p> : null;
  }
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages} &middot; {total} record(s)
        {limit ? ` (${limit} per page)` : ''}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
