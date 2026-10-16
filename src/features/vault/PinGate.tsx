import { useCallback, useEffect, useState } from 'react';
import { Delete, LockKeyhole } from 'lucide-react';
import s from './vault.module.css';
import { Spinner, cx } from '../../components/ui';
import { tryUnlock } from '../../store/vault';
import { VAULT_DEMO_PIN } from '../../config/app';

const LENGTH = VAULT_DEMO_PIN.length;

export function PinGate() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = useCallback((value: string) => {
    setChecking(true);
    // Brief pause so the unlock reads as a deliberate step (purely cosmetic).
    window.setTimeout(() => {
      setChecking(false);
      if (!tryUnlock(value)) {
        setError('Incorrect PIN. Try the demo PIN shown below.');
        setShake(true);
        window.setTimeout(() => { setShake(false); setPin(''); }, 380);
      }
    }, 350);
  }, []);

  const press = useCallback((d: string) => {
    if (checking || pin.length >= LENGTH) return;
    setError(null);
    const next = pin + d;
    setPin(next);
    if (next.length === LENGTH) submit(next);
  }, [checking, pin, submit]);

  const backspace = useCallback(() => { if (!checking) setPin((p) => p.slice(0, -1)); }, [checking]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') setPin('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, backspace]);

  return (
    <div className={s.gate}>
      <div className={s.gateBox}>
        <div className={s.lockIcon}><LockKeyhole size={18} strokeWidth={1.5} /></div>
        <div>
          <div className={s.gateTitle}>Private Vault is locked</div>
          <div className={s.gateSub}>Enter your {LENGTH}-digit PIN</div>
        </div>
        <div className={cx(s.dots, shake && s.shake)} aria-label={`${pin.length} of ${LENGTH} digits entered`} role="status">
          {Array.from({ length: LENGTH }, (_, i) => <span key={i} className={cx(s.dot, i < pin.length && s.dotFilled)} />)}
        </div>
        {checking ? <div className={s.unlocking}><Spinner /> Unlocking…</div> : <div className={s.error} role="alert">{error}</div>}
        <div className={s.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className={s.key} onClick={() => press(d)}>{d}</button>
          ))}
          <button type="button" className={cx(s.key, s.keyGhost)} onClick={() => setPin('')}>Clear</button>
          <button type="button" className={s.key} onClick={() => press('0')}>0</button>
          <button type="button" className={cx(s.key, s.keyGhost)} onClick={backspace} aria-label="Delete digit"><Delete size={18} strokeWidth={1.5} /></button>
        </div>
        <div className={s.hint}>Demo PIN: <b>{VAULT_DEMO_PIN}</b></div>
      </div>
    </div>
  );
}
