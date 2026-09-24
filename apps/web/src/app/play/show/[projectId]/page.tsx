import { ShowScreen } from '@/features/projects/show-screen';

export default async function ShowPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ShowScreen projectId={projectId} />;
}
