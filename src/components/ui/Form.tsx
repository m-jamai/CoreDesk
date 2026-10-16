import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import s from './ui.module.css';
import { cx } from './cx';

export function Field({
  label, hint, error, children, aside, htmlFor,
}: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; aside?: ReactNode; htmlFor?: string }) {
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={htmlFor}>
        <span>{label}</span>
        {aside}
      </label>
      {children}
      {error ? <span className={s.fieldError} role="alert">{error}</span> : hint ? <span className={s.fieldHint}>{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cx(s.input, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return <textarea ref={ref} className={cx(s.textarea, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />;
  },
);

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(s.select, className)} {...rest}>
      {children}
    </select>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

export function SearchInput({
  value, onChange, placeholder = 'Search', width = 220, autoFocus,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string; autoFocus?: boolean }) {
  const id = useId();
  return (
    <div className={s.search} style={{ width }}>
      <label htmlFor={id} className="visually-hidden">{placeholder}</label>
      <Search size={13} strokeWidth={1.75} />
      <input
        id={id}
        className={s.input}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
      />
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
}

export function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; ariaLabel: string }) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title ?? o.label}
          className={cx(s.segment, value === o.value && s.segmentActive)}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <o.icon size={12} strokeWidth={1.75} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx(s.switch, checked && s.switchOn)}
      onClick={() => onChange(!checked)}
    />
  );
}
