import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info } from 'lucide-react';
import s from './ui.module.css';
import { cx } from './cx';
import { Dialog } from './Dialog';
import { Button } from './Button';

/* ---------------- Toasts ---------------- */

type ToastTone = 'success' | 'danger' | 'info';
interface ToastItem { id: number; message: string; tone: ToastTone }

/* ---------------- Confirm ---------------- */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className={s.toasts} aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === 'danger' ? CircleAlert : t.tone === 'info' ? Info : CircleCheck;
          return (
            <div key={t.id} className={cx(s.toast, t.tone !== 'success' && s[`toast_${t.tone}`])}>
              <Icon size={15} strokeWidth={1.75} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
      <Dialog
        open={!!confirmState}
        onClose={() => close(false)}
        title={confirmState?.title ?? ''}
        width={420}
        onSubmit={() => close(true)}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" variant={confirmState?.danger ? 'dangerSolid' : 'primary'} data-autofocus>
              {confirmState?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div style={{ color: 'var(--text-1)', fontSize: 'var(--fs-md)' }}>{confirmState?.message}</div>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
