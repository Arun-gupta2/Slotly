import { notFound } from 'next/navigation';
import { getTeamDetails } from '@/lib/team-actions';
import TeamDetailClient from './TeamDetailClient';

type Params = {
  teamId: string;
};

export default async function TeamDetailPage({ params }: { params: Params }) {
  try {
    const team = await getTeamDetails(params.teamId);
    return <TeamDetailClient team={team} />;
  } catch (err) {
    notFound();
  }
}
