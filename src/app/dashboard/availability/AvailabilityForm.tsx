'use client';

import { useState } from 'react';
import { updateAvailabilitySettings } from '@/lib/actions';
import FormField from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from './availability.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONES = Intl.supportedValuesOf('timeZone');

type Rule = { dayOfWeek: number; startTime: string; endTime: string };

type Props = {
  initialSettings: {
    timezone: string;
    bufferTimeMinutes: number;
    noticePeriodHours: number;
    bookingHorizonDays: number;
    rules: Rule[];
  };
};

export default function AvailabilityForm({ initialSettings }: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [timezone, setTimezone] = useState(() => {
    if (initialSettings.timezone && initialSettings.timezone !== 'UTC') {
      return initialSettings.timezone;
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || initialSettings.timezone || 'UTC';
    } catch {
      return initialSettings.timezone || 'UTC';
    }
  });
  const [buffer, setBuffer] = useState(initialSettings.bufferTimeMinutes);
  const [notice, setNotice] = useState(initialSettings.noticePeriodHours);
  const [horizon, setHorizon] = useState(initialSettings.bookingHorizonDays);
  
  // Group rules by day
  const [rulesByDay, setRulesByDay] = useState<Record<number, Rule[]>>(() => {
    const grouped: Record<number, Rule[]> = {};
    for (let i = 0; i < 7; i++) grouped[i] = [];
    initialSettings.rules.forEach(r => grouped[r.dayOfWeek].push(r));
    
    // If no custom rules saved yet, default to standard Mon-Fri 09:00 - 17:00
    if (initialSettings.rules.length === 0) {
      for (const day of [1, 2, 3, 4, 5]) {
        grouped[day] = [{ dayOfWeek: day, startTime: '09:00', endTime: '17:00' }];
      }
    }
    return grouped;
  });

  const [activeDays, setActiveDays] = useState<Record<number, boolean>>(() => {
    const active: Record<number, boolean> = {};
    const hasRules = initialSettings.rules.length > 0;
    for (let i = 0; i < 7; i++) {
      active[i] = hasRules ? initialSettings.rules.some(r => r.dayOfWeek === i) : [1, 2, 3, 4, 5].includes(i);
    }
    return active;
  });

  function toggleDay(day: number, checked: boolean) {
    setActiveDays(prev => ({ ...prev, [day]: checked }));
    if (checked && rulesByDay[day].length === 0) {
      // Add default 09:00 - 17:00
      setRulesByDay(prev => ({
        ...prev,
        [day]: [{ dayOfWeek: day, startTime: '09:00', endTime: '17:00' }]
      }));
    }
  }

  function addInterval(day: number) {
    setRulesByDay(prev => ({
      ...prev,
      [day]: [...prev[day], { dayOfWeek: day, startTime: '09:00', endTime: '17:00' }]
    }));
  }

  function updateInterval(day: number, index: number, field: 'startTime' | 'endTime', value: string) {
    setRulesByDay(prev => {
      const copy = [...prev[day]];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, [day]: copy };
    });
  }

  function removeInterval(day: number, index: number) {
    setRulesByDay(prev => {
      const copy = [...prev[day]];
      copy.splice(index, 1);
      if (copy.length === 0) {
        setActiveDays(a => ({ ...a, [day]: false }));
      }
      return { ...prev, [day]: copy };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    const finalRules: Rule[] = [];
    for (let i = 0; i < 7; i++) {
      if (activeDays[i]) {
        finalRules.push(...rulesByDay[i]);
      }
    }

    try {
      await updateAvailabilitySettings({
        timezone,
        bufferTimeMinutes: buffer,
        noticePeriodHours: notice,
        bookingHorizonDays: horizon,
        rules: finalRules,
      });
      toast({ variant: 'success', title: 'Settings saved' });
    } catch (err) {
      toast({ variant: 'error', title: 'Error saving settings' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── General Settings ────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>General settings</h2>
        <p className={styles.sectionDesc}>Configure how your time is booked.</p>
        
        <div className={styles.formGrid}>
          <FormField
            as="select"
            id="timezone"
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </FormField>

          <FormField
            type="number"
            id="buffer"
            label="Buffer time (minutes)"
            hint="Added before and after each meeting."
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            min={0}
          />

          <FormField
            type="number"
            id="notice"
            label="Minimum notice (hours)"
            hint="How far in advance guests must book."
            value={notice}
            onChange={(e) => setNotice(Number(e.target.value))}
            min={0}
          />

          <FormField
            type="number"
            id="horizon"
            label="Booking horizon (days)"
            hint="How far into the future guests can book."
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            min={1}
          />
        </div>
      </div>

      {/* ── Weekly Schedule ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Weekly hours</h2>
        <p className={styles.sectionDesc}>Set your recurring availability.</p>
        
        <div className={styles.scheduleList}>
          {DAYS.map((dayName, dayIndex) => {
            const isActive = activeDays[dayIndex];
            const intervals = rulesByDay[dayIndex] || [];
            
            return (
              <div key={dayIndex} className={styles.dayRow}>
                <label className={styles.dayLabel}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => toggleDay(dayIndex, e.target.checked)}
                  />
                  {dayName}
                </label>
                
                <div className={styles.intervals}>
                  {!isActive && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', paddingTop: '6px' }}>
                      Unavailable
                    </span>
                  )}
                  {isActive && intervals.map((interval, i) => (
                    <div key={i} className={styles.interval}>
                      <input
                        type="time"
                        className={styles.timeSelect}
                        value={interval.startTime}
                        onChange={(e) => updateInterval(dayIndex, i, 'startTime', e.target.value)}
                        required
                      />
                      <span className={styles.intervalSeparator}>-</span>
                      <input
                        type="time"
                        className={styles.timeSelect}
                        value={interval.endTime}
                        onChange={(e) => updateInterval(dayIndex, i, 'endTime', e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => removeInterval(dayIndex, i)}
                        aria-label="Remove interval"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {isActive && (
                    <button type="button" className={styles.addBtn} onClick={() => addInterval(dayIndex)}>
                      + Add hours
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button type="submit" className={styles.saveBtn} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  );
}
