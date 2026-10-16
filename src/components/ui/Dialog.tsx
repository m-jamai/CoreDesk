import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './ui.module.css';
import { IconButton } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerLeft?: ReactNode;
  width?: number;
  /** When provided, the body+footer become a <form>; Enter submits. */
  onSubmit?: () => void;
}

/** Stack of open dialogs so Escape only closes the topmost one. */
const stack: symbol[] = [];

export function Dialog({ open, onClose, title, subtitle, children, footer, footerLeft, width = 480, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const downOnBackdrop = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const token = Symbol('dialog');
    stack.push(token);
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), textarea, select, button[type=submit]');
      el?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === token) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(token), 1);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  const inner = (
    <>
      <div className={s.dialogBody}>{children}</div>
      {(footer || footerLeft) && (
        <div className={s.dialogFoot}>
          {footerLeft && <div className={s.dialogFootLeft}>{footerLeft}</div>}
          {footer}
        </div>
      )}
    </>
  );

  return createPortal(
    <div
      className={s.backdrop}
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} className={s.dialog} style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.dialogHead}>
          <div>
            <div className={s.dialogTitle}>{title}</div>
            {subtitle && <div className={s.dialogSub}>{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
        </div>
        {onSubmit ? (
          <form onSubmit={handleSubmit} style={{ display: 'contents' }} noValidate>{inner}</form>
        ) : inner}
      </div>
    </div>,
    document.body,
  );
}
