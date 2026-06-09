'use client';

import * as React from 'react';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuContextValue { open: boolean; setOpen: (o: boolean) => void; }
const MenuContext = React.createContext<MenuContextValue>({ open: false, setOpen: () => {} });

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <MenuContext.Provider value={{ open, setOpen }}><div className="relative inline-block">{children}</div></MenuContext.Provider>;
}

function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = React.useContext(MenuContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(true) });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

function DropdownMenuContent({ className, children, align = 'start' }: { className?: string; children: React.ReactNode; align?: string }) {
  const { open, setOpen } = React.useContext(MenuContext);
  React.useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div className={cn('absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md', align === 'end' ? 'right-0' : 'left-0', 'top-full mt-1', className)}>
      {children}
    </div>
  );
}

function DropdownMenuItem({ className, inset, children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return <div onClick={onClick} className={cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground', inset && 'pl-8', className)} {...props}>{children}</div>;
}

function DropdownMenuSeparator({ className }: { className?: string }) { return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />; }
function DropdownMenuLabel({ className, inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) { return <div className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...props} />; }
function DropdownMenuGroup({ children }: { children: React.ReactNode }) { return <div>{children}</div>; }
function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />; }

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuShortcut };
