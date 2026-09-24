import * as React from 'react';
import { cn } from '@/lib/utils';

const TONE = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-red-500',
  default: 'bg-primary',
};

const Progress = React.forwardRef(({ className, value = 0, tone = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    {...props}
  >
    <div
      className={cn('h-full transition-all', TONE[tone] || TONE.default)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
