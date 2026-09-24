import { WorkshopScreen } from '@/features/workshop/workshop-screen';

export default async function WorkshopProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <WorkshopScreen projectId={projectId} />;
}
