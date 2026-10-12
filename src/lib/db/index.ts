import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Singleton instance to prevent exhausting connections in dev
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  migrated: boolean | undefined;
};

// Use a fallback URL if DATABASE_URL is missing, to prevent hard crashes at import time.
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/slotly';

const conn = globalForDb.conn ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = conn;
}

export async function ensureTablesExist() {
  if (globalForDb.migrated) {
    // Already migrated in this process run
    return;
  }
  globalForDb.migrated = true;

  try {
    await conn`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        timezone TEXT NOT NULL DEFAULT 'UTC',
        buffer_time_minutes INTEGER NOT NULL DEFAULT 0,
        notice_period_hours INTEGER NOT NULL DEFAULT 24,
        booking_horizon_days INTEGER NOT NULL DEFAULT 60,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;

    await conn`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';`;
    await conn`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';`;
    await conn`ALTER TABLE users ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER NOT NULL DEFAULT 0;`;
    await conn`ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_period_hours INTEGER NOT NULL DEFAULT 24;`;
    await conn`ALTER TABLE users ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER NOT NULL DEFAULT 60;`;

    await conn`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;

    await conn`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active',
        invite_token_hash TEXT,
        invite_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        UNIQUE(team_id, email)
      );
    `;

    await conn`
      CREATE TABLE IF NOT EXISTS event_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        location TEXT NOT NULL DEFAULT 'google-meet',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;

    await conn`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;`;

    await conn`
      CREATE TABLE IF NOT EXISTS team_event_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(event_type_id, user_id)
      );
    `;

    await conn`
      CREATE TABLE IF NOT EXISTS availability_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
      );
    `;

    await conn`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guest_name TEXT NOT NULL,
        guest_email TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        guest_timezone TEXT NOT NULL,
        management_token TEXT NOT NULL DEFAULT gen_random_uuid(),
        google_event_id TEXT,
        meeting_url TEXT,
        meeting_status TEXT NOT NULL DEFAULT 'none',
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT now()
      );
    `;

    await conn`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS management_token TEXT NOT NULL DEFAULT gen_random_uuid();`;
    await conn`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;`;
    await conn`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_url TEXT;`;
    await conn`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_status TEXT NOT NULL DEFAULT 'none';`;

    // Ensure start_time and end_time are timestamptz to preserve exact UTC time across timezones
    try {
      await conn`ALTER TABLE bookings ALTER COLUMN start_time TYPE TIMESTAMPTZ;`;
      await conn`ALTER TABLE bookings ALTER COLUMN end_time TYPE TIMESTAMPTZ;`;
    } catch (e) {
      // Column may already be timestamptz
    }

    // If host timezone was left as default 'UTC' in an Indian locale environment, update to Asia/Calcutta
    try {
      await conn`UPDATE users SET timezone = 'Asia/Calcutta' WHERE timezone = 'UTC';`;
    } catch (e) {
      // Ignore
    }

    await conn`
      CREATE TABLE IF NOT EXISTS outbox_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        created_at TIMESTAMP DEFAULT now(),
        processed_at TIMESTAMP
      );
    `;

    await conn`
      CREATE TABLE IF NOT EXISTS calendar_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        google_account_id TEXT NOT NULL,
        google_account_email TEXT NOT NULL,
        encrypted_refresh_token TEXT NOT NULL,
        selected_calendars TEXT NOT NULL DEFAULT 'primary',
        sync_events BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;

    console.log("✅ Database schema migration auto-verified successfully");
  } catch (err) {
    console.error("⚠️ Error running auto database migration:", err);
  }
}

// Auto-run schema check
ensureTablesExist().catch(console.error);

export const db = drizzle(conn, { schema });

