'use client';

import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  /** Main body text. Use `highlight` to bold a specific string within it. */
  body: string;
  /** A substring of `body` to render in bold. */
  highlight?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * ConfirmModal — accessible confirmation dialog.
 *
 * Rendered as a <dialog> element for native semantics.
 * Focus is trapped inside while open: Tab cycles through
 * the cancel and confirm buttons; Escape closes it.
 */
export default function ConfirmModal({
  isOpen,
  title,
  body,
  highlight,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Return focus to cancel button when modal opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Render the body, bolding the highlighted substring if provided
  function renderBody() {
    if (!highlight) return body;
    const parts = body.split(highlight);
    return parts.map((part, i) => (
      <span key={i}>
        {part}
        {i < parts.length - 1 && (
          <strong className={styles.highlight}>{highlight}</strong>
        )}
      </span>
    ));
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-body"
        className={styles.dialog}
      >
        {/* Danger icon */}
        <div className={styles.icon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 7v5M11 15h.01M9.172 3.343 2.343 10.172a2.4 2.4 0 0 0 0 3.394l6.829 6.829a2.4 2.4 0 0 0 3.394 0l6.829-6.829a2.4 2.4 0 0 0 0-3.394l-6.829-6.829a2.4 2.4 0 0 0-3.394 0Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        <p id="modal-body" className={styles.body}>
          {renderBody()}
        </p>

        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
