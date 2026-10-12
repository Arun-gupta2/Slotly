import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import styles from './Button.module.css';

type BaseProps = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: 'button';
    href?: never;
  };

type ButtonAsAnchor = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: 'a';
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

/**
 * Button — polymorphic component that renders either a <button> or <a>.
 *
 * Usage:
 *   <Button variant="primary">Get started</Button>
 *   <Button as="a" href="/signup" variant="primary">Get started</Button>
 *
 * Design decision: keeping Button as a plain HTML element (not a Next.js Link)
 * keeps this component dependency-free. Wrap it in <Link> at the call site
 * when you need client-side navigation.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  as,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (as === 'a') {
    const { href, ...anchorRest } = rest as ButtonAsAnchor;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type: btnType = 'button', ...buttonRest } = rest as ButtonAsButton;
  return (
    <button
      type={btnType}
      className={classes}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
