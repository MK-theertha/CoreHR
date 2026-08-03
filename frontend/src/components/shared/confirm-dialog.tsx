import { useCallback, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolver = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resolver.current?.(false);
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    resolver.current?.(true);
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          {options.description ? <AlertDialogDescription>{options.description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{options.cancelLabel ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction variant={options.destructive ? 'destructive' : 'default'} onClick={handleConfirm}>
            {options.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
