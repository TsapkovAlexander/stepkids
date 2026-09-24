'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { emptyRibbon } from '@/lib/ribbon/ops';
import { createProject, listProjects } from '@/lib/storage/projects';
import { useRequireProfile } from '@/lib/use-require-profile';
import { defaultWorkshopScene } from '@/lib/workshop/scene-edit';

/** Opening the Workshop starts a fresh project and continues in its editor. */
export function NewProject() {
  const router = useRouter();
  const profile = useRequireProfile();
  const started = useRef(false);

  useEffect(() => {
    if (!profile || started.current) return;
    started.current = true;
    void (async () => {
      const count = (await listProjects(profile.id)).length;
      const project = await createProject(
        profile.id,
        defaultWorkshopScene(profile.heroId),
        emptyRibbon(),
        `Проект ${count + 1}`,
      );
      router.replace(`/play/workshop/${project.id}`);
    })();
  }, [profile, router]);

  return <div className="flex-1 animate-pulse bg-white/30" aria-busy />;
}
