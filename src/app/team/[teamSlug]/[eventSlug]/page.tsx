import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { teams, eventTypes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTeamEventAvailableSlots } from '@/lib/scheduling/team-engine';
import TeamBookingFlow from './TeamBookingFlow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = {
  teamSlug: string;
  eventSlug: string;
};

export default async function PublicTeamBookingPage({ params }: { params: Params }) {
  const { teamSlug, eventSlug } = params;

  // 1. Fetch Team
  const team = await db.query.teams.findFirst({
    where: eq(teams.slug, teamSlug),
  });

  if (!team) {
    notFound();
  }

  // 2. Fetch Team Event Type
  const eventType = await db.query.eventTypes.findFirst({
    where: and(
      eq(eventTypes.teamId, team.id),
      eq(eventTypes.slug, eventSlug),
      eq(eventTypes.status, 'published')
    ),
  });

  if (!eventType) {
    notFound();
  }

  // 3. Fetch Available Slots using Round-Robin Team Engine
  const { availableSlots, eligibleHosts } = await getTeamEventAvailableSlots(eventType.id);

  const availableSlotsIso = availableSlots.map((d) => d.toISOString());

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F7F3', padding: '20px' }}>
      <TeamBookingFlow
        team={{ id: team.id, name: team.name, slug: team.slug }}
        eventType={{
          id: eventType.id,
          name: eventType.name,
          description: eventType.description || '',
          durationMinutes: eventType.durationMinutes,
          location: eventType.location,
        }}
        availableSlots={availableSlotsIso}
        eligibleHostsCount={eligibleHosts.length}
      />
    </div>
  );
}
