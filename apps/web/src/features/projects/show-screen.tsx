'use client';

import { defaultCatalog } from '@stepkids/blocks';
import type { GridStage, StageMarkers } from '@stepkids/stage';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { KidButton } from '@/components/kid/kid-button';
import { useDeviceSettings } from '@/lib/settings';
import { getProject } from '@/lib/storage/projects';
import type { Project } from '@/lib/storage/types';
import { sandboxLevel } from '@/lib/workshop/sandbox-level';
import { RunControls } from '../level/run-controls';
import { StageView } from '../level/stage-view';
import { useLevelPlayer } from '../level/use-level-player';

const NO_MARKERS: StageMarkers = {};

/** Full-screen show of a project — to present it to a parent. */
export function ShowScreen({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    void getProject(projectId).then((loaded) => setProject(loaded ?? null));
  }, [projectId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ink/90">
      {project ? <ShowBody project={project} /> : <div className="flex-1" aria-busy={project === undefined} />}
      <div className="absolute top-3 right-3">
        <KidButton voiceLabel="Закрыть показ" icon={X} round onClick={() => router.back()} />
      </div>
    </div>
  );
}

function ShowBody({ project }: { project: Project }) {
  const [stage, setStage] = useState<GridStage | null>(null);
  const { speed } = useDeviceSettings();
  const level = useMemo(() => sandboxLevel(project.scene, defaultCatalog.all().map((def) => def.type), project.title), [project]);
  const { state, player } = useLevelPlayer({ level, markers: NO_MARKERS, stage, speed, onFinish: () => undefined, sandbox: true });
  return (
    <>
      <StageView className="min-h-0 flex-1" label={project.title} onReady={setStage} />
      <div className="p-3">
        <RunControls status={state.status} onPlay={() => player?.play(project.program)} onStop={() => player?.stop()} onStep={() => player?.step(project.program)} />
      </div>
    </>
  );
}
