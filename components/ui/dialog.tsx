'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue { open: boolean; onOpenChange: (o: boolean) => void; }
const DialogContext = React.createContext<DialogContextValue>({ open: false, onOpenChange: () => {} });

function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode }) {
  const [internal, setInternal] = React.useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open! : internal;
  const handle = (v: boolean) => { if (!controlled) setInternal(v); onOpenChange?.(v); };
  return <DialogContext.Provider value={{ open: isOpen, onOpenChange: handle }}>{children}</DialogContext.Provider>;
}

function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DialogContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: () => onOpenChange(true) });
  }
  return <button onClick={() => onOpenChange(true)}>{children}</button>;
}

function DialogPortal({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = React.useContext(DialogContext);
  return <div onClick={() => onOpenChange(false)} className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />;
}

function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = React.useContext(DialogContext);
  if (!open) return null;
  return (
    <>
      <DialogOverlay />
      <div className={cn('fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-background p-6 shadow-lg duration-200 rounded-xl', className)} {...props}>
        {children}
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
      </div>
    </>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />; }
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />; }
function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />; }
function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn('text-sm text-muted-foreground', className)} {...props} />; }

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
