import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// ── Users (Hosts) ──────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull().unique(), // The public slug for /book/[username]
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    bio: text('bio').notNull().default(''),
    
    // Scheduling Settings
    timezone: text('timezone').notNull().default('UTC'),
    bufferTimeMinutes: integer('buffer_time_minutes').notNull().default(0),
    noticePeriodHours: integer('notice_period_hours').notNull().default(24),
    bookingHorizonDays: integer('booking_horizon_days').notNull().default(30),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('username_idx').on(table.username),
  }),
);

// ── Teams ──────────────────────────────────────────────────────────────────

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    teamSlugIdx: uniqueIndex('team_slug_idx').on(table.slug),
  }),
);

// ── Team Members ──────────────────────────────────────────────────────────

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }), // Can be null for pending invites of non-registered emails
    email: text('email').notNull(),
    role: text('role').notNull().default('member'), // 'owner' | 'member'
    status: text('status').notNull().default('active'), // 'active' | 'pending'
    inviteTokenHash: text('invite_token_hash'),
    inviteExpiresAt: timestamp('invite_expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    teamMemberEmailIdx: uniqueIndex('team_member_email_idx').on(table.teamId, table.email),
  }),
);

// ── Availability Rules ─────────────────────────────────────────────────────

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    dayOfWeek: integer('day_of_week').notNull(),
    
    // HH:MM format (e.g., '09:00', '17:00')
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
  },
  (table) => ({
    userDayIdx: index('user_day_idx').on(table.userId, table.dayOfWeek),
  }),
);

// ── Event Types ────────────────────────────────────────────────────────────

export const eventTypes = pgTable(
  'event_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }), // Can be null if pure team event type, or creator ID
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' }),
    
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    durationMinutes: integer('duration_minutes').notNull(),
    location: text('location').notNull(),
    status: text('status').notNull().default('draft'), // 'published' | 'draft'

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userSlugIdx: uniqueIndex('user_slug_idx').on(table.userId, table.slug),
  }),
);

// ── Team Event Members ───────────────────────────────────────────────────

export const teamEventMembers = pgTable(
  'team_event_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventTypeId: uuid('event_type_id')
      .notNull()
      .references(() => eventTypes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    eventUserIdx: uniqueIndex('event_user_idx').on(table.eventTypeId, table.userId),
  }),
);

// ── Bookings ───────────────────────────────────────────────────────────────

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventTypeId: uuid('event_type_id')
      .notNull()
      .references(() => eventTypes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    
    // Absolute instants in time
    startTime: timestamp('start_time', { withTimezone: true, mode: 'date' }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true, mode: 'date' }).notNull(),
    
    // Timezone chosen by guest (for display)
    guestTimezone: text('guest_timezone').notNull(),
    
    status: text('status').notNull().default('confirmed'), // 'confirmed' | 'cancelled'
    managementToken: text('management_token').notNull(),
    googleEventId: text('google_event_id'),
    meetingUrl: text('meeting_url'),
    meetingStatus: text('meeting_status').notNull().default('none'), // 'none' | 'pending' | 'ready' | 'failed'
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userTimeIdx: index('user_time_idx').on(table.userId, table.startTime, table.endTime),
  }),
);

// ── Outbox Messages ────────────────────────────────────────────────────────
export const outboxMessages = pgTable('outbox_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'GUEST_CONFIRMATION', 'HOST_NOTIFICATION', 'CANCELLATION', 'TEAM_INVITATION'
  payload: text('payload').notNull(), // JSON stringified data
  status: text('status').notNull().default('pending'), // 'pending', 'processed', 'failed'
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

// ── Calendar Connections ───────────────────────────────────────────────────
export const calendarConnections = pgTable('calendar_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(), // 1 connection per user for now
  
  googleAccountId: text('google_account_id').notNull(),
  googleAccountEmail: text('google_account_email').notNull(),
  
  encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
  
  // A comma-separated list of calendar IDs they want to check conflicts for
  selectedCalendars: text('selected_calendars').notNull().default('primary'),
  
  // Boolean to determine if we should create events on their primary calendar
  syncEvents: boolean('sync_events').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  availabilityRules: many(availabilityRules),
  eventTypes: many(eventTypes),
  bookings: many(bookings),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  eventTypes: many(eventTypes),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const eventTypesRelations = relations(eventTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [eventTypes.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [eventTypes.teamId],
    references: [teams.id],
  }),
  teamEventMembers: many(teamEventMembers),
  bookings: many(bookings),
}));

export const teamEventMembersRelations = relations(teamEventMembers, ({ one }) => ({
  eventType: one(eventTypes, {
    fields: [teamEventMembers.eventTypeId],
    references: [eventTypes.id],
  }),
  user: one(users, {
    fields: [teamEventMembers.userId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  eventType: one(eventTypes, {
    fields: [bookings.eventTypeId],
    references: [eventTypes.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

