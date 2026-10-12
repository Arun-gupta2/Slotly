import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';
import styles from './FormField.module.css';

/** Shared props for all FormField variants. */
type BaseFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

// ─── Input variant ────────────────────────────────────────────────────────────

type InputFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    as?: 'input';
  };

// ─── Textarea variant ─────────────────────────────────────────────────────────

type TextareaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
    as: 'textarea';
  };

// ─── Select variant ───────────────────────────────────────────────────────────

type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    as: 'select';
    children: React.ReactNode;
  };

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

/**
 * FormField — reusable labeled form control.
 *
 * Renders <input>, <textarea>, or <select> depending on the `as` prop.
 * Wires up aria-describedby for both hint and error messages automatically.
 *
 * Usage:
 *   <FormField id="name" label="Event name" required error={errors.name}
 *              value={name} onChange={…} />
 *   <FormField as="textarea" id="desc" label="Description" … />
 *   <FormField as="select" id="dur" label="Duration" …>
 *     <option value="30">30 minutes</option>
 *   </FormField>
 */
export default function FormField(props: FormFieldProps) {
  const { id, label, error, hint, required, as = 'input', className = '', ...rest } = props;

  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  const sharedProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': hasError ? (true as const) : undefined,
    'aria-required': required ? (true as const) : undefined,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}

      {as === 'textarea' ? (
        <textarea
          className={[
            styles.textarea,
            hasError ? styles.hasError : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...sharedProps}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === 'select' ? (
        <select
          className={[
            styles.select,
            hasError ? styles.hasError : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...sharedProps}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input
          className={[
            styles.input,
            hasError ? styles.hasError : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...sharedProps}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <svg
            className={styles.errorIcon}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 3.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <circle cx="6" cy="8.5" r="0.625" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
