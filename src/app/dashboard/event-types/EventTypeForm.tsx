'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import type {
  EventType,
  EventTypeFormData,
  FormErrors,
  DurationMinutes,
  MeetingLocation,
} from '@/lib/types';
import { DURATION_OPTIONS, LOCATION_OPTIONS } from '@/lib/types';
import FormField from '@/components/ui/FormField';
import formStyles from './form.module.css';

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validate(data: EventTypeFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) {
    errors.name = 'Event name is required.';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  } else if (data.name.trim().length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }
  if (data.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }
  if (data.location.startsWith('custom-link:') || data.location === 'custom-link') {
    const urlPart = data.location.startsWith('custom-link:') ? data.location.slice('custom-link:'.length).trim() : '';
    if (!urlPart) {
      errors.location = 'Please provide a valid meeting URL (e.g. https://zoom.us/j/123456).';
    } else if (!isValidHttpUrl(urlPart)) {
      errors.location = 'Please enter a valid HTTP or HTTPS meeting URL.';
    }
  }
  return errors;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EventTypeFormProps = {
  /** Pre-populated values when editing; undefined when creating. */
  initialValues?: Partial<EventType>;
  isEditing?: boolean;
  onSave: (data: EventTypeFormData) => void;
  onDelete?: () => void;
  isSaving?: boolean;
};

const DEFAULTS: EventTypeFormData = {
  name: '',
  description: '',
  durationMinutes: 30,
  location: 'google-meet',
  status: 'draft',
};

/**
 * EventTypeForm — shared create / edit form.
 *
 * Validates on blur and on submit. Shows inline errors.
 * Passes clean EventTypeFormData to onSave; never touches storage directly.
 */
export default function EventTypeForm({
  initialValues,
  isEditing = false,
  onSave,
  onDelete,
  isSaving = false,
}: EventTypeFormProps) {
  const [formData, setFormData] = useState<EventTypeFormData>({
    name: initialValues?.name ?? DEFAULTS.name,
    description: initialValues?.description ?? DEFAULTS.description,
    durationMinutes: initialValues?.durationMinutes ?? DEFAULTS.durationMinutes,
    location: initialValues?.location ?? DEFAULTS.location,
    status: initialValues?.status ?? DEFAULTS.status,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ── Field helpers ─────────────────────────────────────────────────────────

  function handleChange(field: keyof EventTypeFormData, value: EventTypeFormData[typeof field]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const updated = { ...formData, [field]: value };
      const newErrors = validate(updated);
      setErrors((prev) => ({
        ...prev,
        [field]: newErrors[field],
      }));
    }
  }

  function handleBlur(field: keyof FormErrors) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = validate(formData);
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors = validate(formData);
    setErrors(newErrors);
    const allTouched: Record<string, boolean> = {};
    Object.keys(DEFAULTS).forEach((k) => {
      allTouched[k] = true;
    });
    setTouched(allTouched);

    if (Object.keys(newErrors).length > 0) {
      // Focus the first field with an error
      const firstErrorField = Object.keys(newErrors)[0];
      const el = document.getElementById(firstErrorField);
      el?.focus();
      return;
    }

    onSave(formData);
  }

  const charCount = formData.description.length;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isEditing ? 'Edit event type' : 'Create event type'}>
      <div className={formStyles.formCard}>

        {/* ── Basic info ─────────────────────────────────────────────── */}
        <div className={formStyles.formSection}>
          <p className={formStyles.formSectionTitle}>Basic info</p>
          <div className={formStyles.fieldGroup}>
            <FormField
              id="name"
              label="Event name"
              required
              placeholder="e.g. 30-minute intro call"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleChange('name', e.target.value)
              }
              onBlur={() => handleBlur('name')}
              error={errors.name}
              maxLength={80}
              autoComplete="off"
              autoFocus={!isEditing}
            />

            <FormField
              as="textarea"
              id="description"
              label="Description"
              hint={`${charCount}/500 characters — shown to guests on the booking page.`}
              placeholder="A short, welcoming description of this meeting type…"
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                handleChange('description', e.target.value)
              }
              onBlur={() => handleBlur('description')}
              error={errors.description}
              maxLength={500}
            />
          </div>
        </div>

        {/* ── Duration ───────────────────────────────────────────────── */}
        <div className={formStyles.formSection}>
          <p className={formStyles.formSectionTitle}>Duration</p>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only">Meeting duration</legend>
            <div className={formStyles.radioGroup} role="radiogroup">
              {DURATION_OPTIONS.map((opt) => (
                <div key={opt.value} className={formStyles.radioOption}>
                  <input
                    type="radio"
                    id={`duration-${opt.value}`}
                    name="duration"
                    value={opt.value}
                    checked={formData.durationMinutes === opt.value}
                    onChange={() =>
                      handleChange('durationMinutes', opt.value as DurationMinutes)
                    }
                  />
                  <label htmlFor={`duration-${opt.value}`} className={formStyles.radioLabel}>
                    <span>{opt.value}</span>
                    <span className={formStyles.radioMins}>min</span>
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        {/* ── Location ───────────────────────────────────────────────── */}
        <div className={formStyles.formSection}>
          <p className={formStyles.formSectionTitle}>Meeting location</p>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only">Meeting location</legend>
            <div className={formStyles.locationGroup}>
              {LOCATION_OPTIONS.map((opt) => {
                const isSelected =
                  opt.value === 'custom-link'
                    ? formData.location.startsWith('custom-link')
                    : formData.location === opt.value;

                return (
                  <div key={opt.value} className={formStyles.locationOption}>
                    <input
                      type="radio"
                      id={`location-${opt.value}`}
                      name="location"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => {
                        if (opt.value === 'custom-link') {
                          handleChange('location', 'custom-link');
                        } else {
                          handleChange('location', opt.value as MeetingLocation);
                        }
                      }}
                    />
                    <label htmlFor={`location-${opt.value}`} className={formStyles.locationLabel}>
                      <span className={formStyles.locationIcon} aria-hidden="true">
                        {opt.icon}
                      </span>
                      <span className={formStyles.locationText}>
                        <span className={formStyles.locationName}>{opt.label}</span>
                        <span className={formStyles.locationDesc}>
                          {opt.value === 'google-meet' && 'A unique Google Meet conference will be scheduled automatically'}
                          {opt.value === 'custom-link' && 'Provide your own video meeting link (Zoom, Teams, Webex, etc.)'}
                          {opt.value === 'phone' && 'Phone call appointment'}
                          {opt.value === 'in-person' && 'In-person appointment without video link'}
                        </span>
                      </span>
                      <span className={formStyles.locationCheck} aria-hidden="true">
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M2 5l2.5 2.5 4-5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </label>

                    {opt.value === 'custom-link' && isSelected && (
                      <div style={{ marginTop: '8px', paddingLeft: '32px' }}>
                        <input
                          type="url"
                          id="custom-meeting-url"
                          placeholder="https://zoom.us/j/123456789 or https://teams.microsoft.com/..."
                          value={formData.location.startsWith('custom-link:') ? formData.location.slice('custom-link:'.length) : ''}
                          onChange={(e) => {
                            handleChange('location', `custom-link:${e.target.value.trim()}`);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: errors.location ? '1.5px solid #DC2626' : '1px solid var(--color-border)',
                            fontSize: 'var(--text-sm)',
                          }}
                        />
                        {errors.location && (
                          <p style={{ color: '#DC2626', fontSize: 'var(--text-xs)', marginTop: '4px' }}>
                            {errors.location}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* ── Status toggle ──────────────────────────────────────────── */}
        <div className={formStyles.formSection}>
          <p className={formStyles.formSectionTitle}>Visibility</p>
          <div className={formStyles.toggleRow}>
            <div className={formStyles.toggleInfo}>
              <span className={formStyles.toggleLabel}>Publish event type</span>
              <span className={formStyles.toggleDesc}>
                Published event types are accessible via your booking link.
                Drafts are hidden from guests.
              </span>
            </div>
            <label className={formStyles.toggleSwitch} aria-label="Publish event type">
              <input
                type="checkbox"
                id="status"
                checked={formData.status === 'published'}
                onChange={(e) =>
                  handleChange('status', e.target.checked ? 'published' : 'draft')
                }
              />
              <span className={formStyles.toggleTrack} aria-hidden="true" />
              <span className={formStyles.toggleThumb} aria-hidden="true" />
            </label>
          </div>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className={formStyles.formActions}>
        <div className={formStyles.actionsPrimary}>
          <button
            id="save-event-type"
            type="submit"
            className={formStyles.saveBtn}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create event type'}
          </button>
          <Link href="/dashboard/event-types" className={formStyles.cancelBtn}>
            Cancel
          </Link>
        </div>

        {isEditing && onDelete && (
          <button
            type="button"
            className={formStyles.dangerBtn}
            onClick={onDelete}
            id="delete-event-type-btn"
            aria-label="Delete this event type"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M11.5 3.5l-.8 8a1 1 0 0 1-1 .9H4.3a1 1 0 0 1-1-.9l-.8-8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete event type
          </button>
        )}
      </div>
    </form>
  );
}
