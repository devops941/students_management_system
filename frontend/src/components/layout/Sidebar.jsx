import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { NAV_SECTIONS } from '@/lib/navigation';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const Icon = Icons[item.icon] || Icons.Circle;
  const isActive = location.pathname === item.to || (item.to !== '/' && item.to.length > 1 && location.pathname.startsWith(item.to + '/'));

  const content = (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all',
        collapsed && 'mx-auto h-9 w-9 justify-center p-0 rounded-lg',
        isActive
          ? 'bg-blue-600 text-white shadow-sm font-semibold dark:bg-blue-600 dark:text-white'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white',
      )}
    >
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          collapsed ? 'h-5 w-5' : 'h-4.5 w-4.5',
          isActive
            ? 'text-white'
            : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white',
        )}
        strokeWidth={2.1}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-semibold text-xs shadow-md">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate }) {
  const { user } = useAuth();
  const role = user?.role;

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className={cn('flex h-14 items-center border-b px-3.5', collapsed ? 'justify-center px-0' : 'justify-between')}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus:outline-none"
                  title="Expand sidebar"
                >
                  <Icons.GraduationCap className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold text-xs">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Icons.GraduationCap className="h-4.5 w-4.5" />
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-bold tracking-tight">SAMS</p>
                  <p className="text-[10px] text-muted-foreground">Attendance System</p>
                </div>
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                  title="Collapse sidebar"
                >
                  <Icons.PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav items - optimized spacing & text size */}
        <nav className={cn('flex-1 overflow-y-auto px-2 py-1.5 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]', collapsed && 'px-1 space-y-1')}>
          {sections.map((section, idx) => (
            <div key={section.title} className="space-y-0.5">
              {!collapsed ? (
                <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
              ) : idx > 0 ? (
                <div className="my-1 border-t border-border/60 mx-1.5" />
              ) : null}
              {section.items.map((item) => (
                <NavItem key={item.to + item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;
