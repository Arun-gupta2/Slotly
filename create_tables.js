const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found in .env.local");
    return;
  }

  console.log("Connecting to database...");
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    console.log("Creating users table...");
    await sql`
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

    console.log("Creating event_types table...");
    await sql`
      CREATE TABLE IF NOT EXISTS event_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    console.log("Creating availability_rules table...");
    await sql`
      CREATE TABLE IF NOT EXISTS availability_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
      );
    `;

    console.log("Creating bookings table...");
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guest_name TEXT NOT NULL,
        guest_email TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        guest_timezone TEXT NOT NULL,
        management_token TEXT NOT NULL DEFAULT gen_random_uuid(),
        google_event_id TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT now()
      );
    `;

    console.log("Creating outbox_messages table...");
    await sql`
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

    console.log("Creating calendar_connections table...");
    await sql`
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

    console.log("Creating teams table...");
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;

    console.log("Creating team_members table...");
    await sql`
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

    console.log("Creating team_event_members table...");
    await sql`
      CREATE TABLE IF NOT EXISTS team_event_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(event_type_id, user_id)
      );
    `;

    // Ensure team_id exists on event_types
    await sql`
      ALTER TABLE event_types ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
    `;

    // Ensure management_token exists in case table was already created
    await sql`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS management_token TEXT NOT NULL DEFAULT gen_random_uuid();
    `;
    
    // Ensure google_event_id exists
    await sql`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;
    `;

    // Ensure bio exists
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
    `;

    console.log("✅ All tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  } finally {
    await sql.end();
  }
}

main();

