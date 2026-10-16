import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import s from './ui.module.css';
import { cx } from './cx';

type Variant = 'secondary' | 'primary' | 'ghost' | 'danger' | 'dangerSolid';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconR, className, children, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 13 : 14;
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.btn, variant !== 'secondary' && s[variant], size !== 'md' && s[size], className)}
      {...rest}
    >
      {Icon && <Icon size={iconSize} strokeWidth={1.75} />}
      {children}
      {IconR && <IconR size={iconSize} strokeWidth={1.75} />}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: 'sm' | 'md';
  active?: boolean;
  bordered?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', active, bordered, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(s.iconBtn, size === 'sm' && s.sm, active && s.iconBtnActive, bordered && s.iconBtnBordered, className)}
      {...rest}
    >
      <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.75} />
    </button>
  );
});
