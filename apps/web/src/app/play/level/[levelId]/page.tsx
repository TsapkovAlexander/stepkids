import { LevelScreen } from '@/features/level/level-screen';

export default async function LevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  return <LevelScreen levelId={levelId} />;
}
