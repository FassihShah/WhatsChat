'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue { value: string; onValueChange: (v: string) => void; open: boolean; setOpen: (o: boolean) => void; }
const SelectContext = React.createContext<SelectContextValue>({ value: '', onValueChange: () => {}, open: false, setOpen: () => {} });

function Select({ value, defaultValue, onValueChange, children }: { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  const [internal, setInternal] = React.useState(defaultValue || '');
  const [open, setOpen] = React.useState(false);
  const controlled = value !== undefined;
  const current = controlled ? value! : internal;
  const handleChange = (v: string) => { if (!controlled) setInternal(v); onValueChange?.(v); setOpen(false); };
  return <SelectContext.Provider value={{ value: current, onValueChange: handleChange, open, setOpen }}>{children}</SelectContext.Provider>;
}

function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button type="button" onClick={() => setOpen(!open)} className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder || ''}</span>;
}

function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div className={cn('absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1', className)}>
      <div className="p-1">{children}</div>
    </div>
  );
}

function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(SelectContext);
  return (
    <div onClick={() => ctx.onValueChange(value)} className={cn('relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground', ctx.value === value ? 'bg-accent' : '', className)}>
      {children}
    </div>
  );
}

function SelectGroup({ children }: { children: React.ReactNode }) { return <div>{children}</div>; }
function SelectLabel({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn('py-1.5 pl-2 pr-8 text-sm font-semibold', className)}>{children}</div>; }
function SelectSeparator({ className }: { className?: string }) { return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />; }

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
