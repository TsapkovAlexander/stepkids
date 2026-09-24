import { WorldScreen } from '@/features/map/world-screen';

export default async function WorldPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await params;
  return <WorldScreen worldId={worldId} />;
}
