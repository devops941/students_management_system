import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { NAV_SECTIONS } from '@/lib/navigation';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = Icons[item.icon] || Icons.Circle;
  const content = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
          collapsed && 'justify-center px-2 py-2.5',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
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
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn('flex h-14 items-center border-b px-3.5', collapsed ? 'justify-center' : 'justify-between')}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:scale-105"
                >
                  <Icons.GraduationCap className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Collapse sidebar"
                >
                  <Icons.PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav items with hidden scrollbar */}
        <nav className="flex-1 space-y-2.5 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!collapsed && (
                <p className="px-2.5 pb-0.5 pt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavItem key={item.to + item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn('border-t p-2.5', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {role?.[0]}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                Signed in as <span className="font-semibold">{role}</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <p className="px-1 text-[11px] text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{role}</span>
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;
