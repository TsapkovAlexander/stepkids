'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KidButton } from './kid-button';

export interface KidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Screen-reader description; the visible content usually explains itself with pictures. */
  description?: string;
  children: ReactNode;
  className?: string;
  /** Hide the close cross (e.g. the victory screen has its own buttons). */
  hideClose?: boolean;
}

/** Big friendly modal with a focus trap and Escape to close. */
export function KidDialog({ open, onOpenChange, title, description, children, className, hideClose }: KidDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[pop_200ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-(--z-dialog) max-h-[92dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-cream p-5 shadow-2xl outline-none',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <Dialog.Title className="pr-14 text-2xl font-black text-ink">{title}</Dialog.Title>
          {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : null}
          {!hideClose ? (
            <Dialog.Close asChild>
              <KidButton voiceLabel="Закрыть" icon={X} round className="absolute top-4 right-4" />
            </Dialog.Close>
          ) : null}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
