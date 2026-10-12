'use server';

import { db } from './db';
import { teams, teamMembers, eventTypes, teamEventMembers, users, outboxMessages } from './db/schema';
import { eq, and, ne, inArray, sql } from 'drizzle-orm';
import { getSessionUser } from './actions';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function createTeam(data: { name: string }) {
  const user = await getSessionUser();

  let baseSlug = toSlug(data.name);
  if (!baseSlug) baseSlug = 'team';

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.slug, slug),
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const team = await db.transaction(async (tx) => {
    const [newTeam] = await tx
      .insert(teams)
      .values({
        name: data.name,
        slug,
      })
      .returning();

    await tx.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: user.id,
      email: user.email.toLowerCase(),
      role: 'owner',
      status: 'active',
    });

    return newTeam;
  });

  revalidatePath('/dashboard/teams');
  return team;
}

export async function getUserTeams() {
  const user = await getSessionUser();

  const userMemberships = await db.query.teamMembers.findMany({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.status, 'active')),
    with: {
      team: {
        with: {
          members: true,
        },
      },
    },
  });

  return userMemberships.map((m) => ({
    ...m.team,
    userRole: m.role,
  }));
}

export async function getPendingUserInvitations() {
  const user = await getSessionUser();

  const pendingInvites = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.email, user.email.toLowerCase()),
      eq(teamMembers.status, 'pending')
    ),
    with: {
      team: true,
    },
  });

  return pendingInvites;
}

export async function getTeamDetails(teamId: string) {
  const user = await getSessionUser();

  // Verify membership
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership) {
    throw new Error('Not authorized or not a member of this team');
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      members: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      },
      eventTypes: {
        with: {
          teamEventMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  return {
    ...team,
    currentUserRole: membership.role,
  };
}

export async function inviteTeamMember(teamId: string, email: string) {
  const currentUser = await getSessionUser();
  const sanitizedEmail = email.trim().toLowerCase();

  // Verify caller is owner
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership || membership.role !== 'owner') {
    throw new Error('Only team owners can invite members');
  }

  // Check if member already exists in team
  const existingMember = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.email, sanitizedEmail)
    ),
  });

  if (existingMember && existingMember.status === 'active') {
    throw new Error('User is already an active member of this team');
  }

  // Create invite token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check if target user has an existing account
  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, sanitizedEmail),
  });

  if (existingMember) {
    // Update existing pending invite
    await db
      .update(teamMembers)
      .set({
        inviteTokenHash: tokenHash,
        inviteExpiresAt: expiresAt,
        status: 'pending',
        userId: targetUser ? targetUser.id : null,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, existingMember.id));
  } else {
    // Create new invite record
    await db.insert(teamMembers).values({
      teamId,
      userId: targetUser ? targetUser.id : null,
      email: sanitizedEmail,
      role: 'member',
      status: 'pending',
      inviteTokenHash: tokenHash,
      inviteExpiresAt: expiresAt,
    });
  }

  // Queue invitation email in outbox
  await db.insert(outboxMessages).values({
    type: 'TEAM_INVITATION',
    payload: JSON.stringify({
      teamId,
      email: sanitizedEmail,
      rawToken,
    }),
  });

  // Asynchronously process outbox with await so serverless/Vercel functions do not terminate early
  const { processOutbox } = await import('./email');
  await processOutbox().catch(console.error);

  revalidatePath(`/dashboard/teams/${teamId}`);
  
  const { getBaseUrl } = await import('./url');
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/team/invite/${rawToken}`;

  // Safe user feedback without revealing account existence status to prevent enumeration
  return { 
    success: true, 
    message: 'Invitation sent and generated successfully', 
    inviteUrl 
  };
}

export async function getInvitationByToken(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.inviteTokenHash, tokenHash),
      eq(teamMembers.status, 'pending')
    ),
    with: {
      team: true,
    },
  });

  if (!invite) return null;

  if (invite.inviteExpiresAt && invite.inviteExpiresAt < new Date()) {
    return { expired: true, invite };
  }

  return { expired: false, invite };
}

export async function acceptInvitation(token: string) {
  const currentUser = await getSessionUser();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.inviteTokenHash, tokenHash),
      eq(teamMembers.status, 'pending')
    ),
  });

  if (!invite) {
    throw new Error('Invalid or non-existent invitation');
  }

  if (invite.inviteExpiresAt && invite.inviteExpiresAt < new Date()) {
    throw new Error('Invitation token has expired');
  }

  // Verify email matches logged-in user
  if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address');
  }

  await db
    .update(teamMembers)
    .set({
      status: 'active',
      userId: currentUser.id,
      inviteTokenHash: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(teamMembers.id, invite.id));

  revalidatePath('/dashboard/teams');
  return { success: true, teamId: invite.teamId };
}

export async function declineInvitation(token: string) {
  const currentUser = await getSessionUser();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.inviteTokenHash, tokenHash),
      eq(teamMembers.status, 'pending')
    ),
  });

  if (!invite) {
    throw new Error('Invalid or non-existent invitation');
  }

  if (currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address');
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, invite.id));

  revalidatePath('/dashboard/teams');
  return { success: true };
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const currentUser = await getSessionUser();

  // Check caller role
  const callerMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!callerMembership || callerMembership.role !== 'owner') {
    throw new Error('Only team owners can remove members');
  }

  // Target member
  const targetMember = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, memberId),
  });

  if (!targetMember || targetMember.teamId !== teamId) {
    throw new Error('Member not found in team');
  }

  if (targetMember.userId === currentUser.id) {
    throw new Error('Cannot remove yourself. Use leave team option instead.');
  }

  await db.transaction(async (tx) => {
    // If target has a userId, remove from team event members
    if (targetMember.userId) {
      const teamEvents = await tx.query.eventTypes.findMany({
        where: eq(eventTypes.teamId, teamId),
      });
      const teamEventIds = teamEvents.map((e) => e.id);

      if (teamEventIds.length > 0) {
        await tx.delete(teamEventMembers).where(
          and(
            inArray(teamEventMembers.eventTypeId, teamEventIds),
            eq(teamEventMembers.userId, targetMember.userId)
          )
        );
      }
    }

    await tx.delete(teamMembers).where(eq(teamMembers.id, memberId));
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  return { success: true };
}

export async function renameTeam(teamId: string, newName: string) {
  const currentUser = await getSessionUser();

  const callerMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!callerMembership || callerMembership.role !== 'owner') {
    throw new Error('Only team owners can rename the team');
  }

  let baseSlug = toSlug(newName);
  if (!baseSlug) baseSlug = 'team';

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.query.teams.findFirst({
      where: and(eq(teams.slug, slug), ne(teams.id, teamId)),
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  await db
    .update(teams)
    .set({
      name: newName,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  revalidatePath(`/dashboard/teams/${teamId}`);
  revalidatePath('/dashboard/teams');
  return { success: true, slug };
}

export async function leaveTeam(teamId: string) {
  const currentUser = await getSessionUser();

  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership) {
    throw new Error('Not an active member of this team');
  }

  if (membership.role === 'owner') {
    // Check if there are other active owners
    const otherOwners = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.role, 'owner'),
        eq(teamMembers.status, 'active'),
        ne(teamMembers.userId, currentUser.id)
      ),
    });

    const otherActiveMembers = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, 'active'),
        ne(teamMembers.userId, currentUser.id)
      ),
    });

    if (otherOwners.length === 0 && otherActiveMembers.length > 0) {
      throw new Error('Cannot leave team without an owner. Transfer ownership or promote another member first.');
    }
  }

  await db.transaction(async (tx) => {
    // Clean up team event memberships
    const teamEvents = await tx.query.eventTypes.findMany({
      where: eq(eventTypes.teamId, teamId),
    });
    const teamEventIds = teamEvents.map((e) => e.id);

    if (teamEventIds.length > 0) {
      await tx.delete(teamEventMembers).where(
        and(
          inArray(teamEventMembers.eventTypeId, teamEventIds),
          eq(teamEventMembers.userId, currentUser.id)
        )
      );
    }

    await tx.delete(teamMembers).where(eq(teamMembers.id, membership.id));
  });

  revalidatePath('/dashboard/teams');
  return { success: true };
}

// ── Team Event Types Actions ──────────────────────────────────────────────

export async function createTeamEventType(
  teamId: string,
  data: {
    name: string;
    description: string;
    durationMinutes: number;
    location: string;
    status: 'published' | 'draft';
    eligibleUserIds: string[];
  }
) {
  const currentUser = await getSessionUser();

  // Verify caller is an active team member
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership) {
    throw new Error('Not authorized to create event types for this team');
  }

  // Verify all eligible users are active team members
  if (data.eligibleUserIds.length > 0) {
    const validMembers = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, 'active'),
        inArray(teamEventMembers.userId, data.eligibleUserIds)
      ),
    });

    // Check count matching
    const activeMemberUserIds = new Set(
      (
        await db.query.teamMembers.findMany({
          where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, 'active')),
        })
      )
        .map((m) => m.userId)
        .filter(Boolean)
    );

    for (const uid of data.eligibleUserIds) {
      if (!activeMemberUserIds.has(uid)) {
        throw new Error(`User ${uid} is not an active member of this team`);
      }
    }
  }

  let baseSlug = toSlug(data.name);
  if (!baseSlug) baseSlug = 'event';

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.query.eventTypes.findFirst({
      where: and(eq(eventTypes.teamId, teamId), eq(eventTypes.slug, slug)),
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const eventType = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(eventTypes)
      .values({
        teamId,
        userId: currentUser.id, // creator
        name: data.name,
        slug,
        description: data.description,
        durationMinutes: data.durationMinutes,
        location: data.location,
        status: data.status,
      })
      .returning();

    if (data.eligibleUserIds.length > 0) {
      await tx.insert(teamEventMembers).values(
        data.eligibleUserIds.map((userId) => ({
          eventTypeId: inserted.id,
          userId,
        }))
      );
    }

    return inserted;
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  return eventType;
}

export async function updateTeamEventType(
  teamId: string,
  eventTypeId: string,
  data: {
    name?: string;
    description?: string;
    durationMinutes?: number;
    location?: string;
    status?: 'published' | 'draft';
    eligibleUserIds?: string[];
  }
) {
  const currentUser = await getSessionUser();

  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership) {
    throw new Error('Not authorized to edit event types for this team');
  }

  const existing = await db.query.eventTypes.findFirst({
    where: and(eq(eventTypes.id, eventTypeId), eq(eventTypes.teamId, teamId)),
  });

  if (!existing) {
    throw new Error('Event type not found');
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.status !== undefined) updateData.status = data.status;

  if (data.name && data.name !== existing.name) {
    let baseSlug = toSlug(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const collision = await db.query.eventTypes.findFirst({
        where: and(eq(eventTypes.teamId, teamId), eq(eventTypes.slug, slug)),
      });
      if (!collision || collision.id === eventTypeId) break;
      slug = `${baseSlug}-${counter++}`;
    }
    updateData.slug = slug;
  }

  await db.transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx
        .update(eventTypes)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(eventTypes.id, eventTypeId));
    }

    if (data.eligibleUserIds !== undefined) {
      // Validate eligible users
      const activeMembers = await tx.query.teamMembers.findMany({
        where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, 'active')),
      });
      const activeUserIds = new Set(activeMembers.map((m) => m.userId).filter(Boolean));

      for (const uid of data.eligibleUserIds) {
        if (!activeUserIds.has(uid)) {
          throw new Error(`User ${uid} is not an active member of this team`);
        }
      }

      await tx.delete(teamEventMembers).where(eq(teamEventMembers.eventTypeId, eventTypeId));

      if (data.eligibleUserIds.length > 0) {
        await tx.insert(teamEventMembers).values(
          data.eligibleUserIds.map((userId) => ({
            eventTypeId,
            userId,
          }))
        );
      }
    }
  });

  revalidatePath(`/dashboard/teams/${teamId}`);
  return { success: true };
}

export async function deleteTeamEventType(teamId: string, eventTypeId: string) {
  const currentUser = await getSessionUser();

  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, currentUser.id),
      eq(teamMembers.status, 'active')
    ),
  });

  if (!membership) {
    throw new Error('Not authorized to delete event types for this team');
  }

  await db
    .delete(eventTypes)
    .where(and(eq(eventTypes.id, eventTypeId), eq(eventTypes.teamId, teamId)));

  revalidatePath(`/dashboard/teams/${teamId}`);
  return { success: true };
}
