'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, MessageSquare, Users, BookOpen, Bot,
  Settings, LogOut, Menu, X, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/ai-agent', label: 'AI Agent', icon: Bot },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--sidebar-background))' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-[#128c7e] flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">WhatsChat AI</p>
            <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Business Inbox</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#128c7e] text-white shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-sidebar-foreground/70')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 pb-4 border-t border-sidebar-border pt-4">
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-colors', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-[#128c7e]/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">
              {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/70 hover:text-red-400" />
          </button>
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Collapse
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-2 w-full flex justify-center py-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 transition-all duration-300 border-r border-sidebar-border',
          collapsed ? 'w-16' : 'w-56'
        )}
        style={{ background: 'hsl(var(--sidebar-background))' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#128c7e] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">WhatsChat AI</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
