'use client';

import { sceneThumbnailSvg, svgDataUrl } from '@stepkids/stage/art';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map as MapIcon, Pencil, Play, Plus, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KidButton } from '@/components/kid/kid-button';
import { KidDialog } from '@/components/kid/kid-dialog';
import { sfx } from '@/lib/audio/sfx';
import { deleteProject, listProjects } from '@/lib/storage/projects';
import type { Project } from '@/lib/storage/types';
import { useRequireProfile } from '@/lib/use-require-profile';
import { voice } from '@/lib/voice/voice';

/** "Мои проекты": cards with a picture of each field; open, show full screen or delete. */
export function ProjectsScreen() {
  const router = useRouter();
  const profile = useRequireProfile();
  const projects = useLiveQuery(
    async (): Promise<Project[]> => (profile ? listProjects(profile.id) : []),
    [profile?.id],
    undefined,
  );
  const [doomed, setDoomed] = useState<Project | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 p-3 sm:p-4">
        <KidButton
          voiceLabel="На карту"
          icon={MapIcon}
          round
          onClick={() => router.push('/play/map')}
        />
        <h1 className="text-3xl font-black">Мои проекты</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8" aria-busy={projects === undefined}>
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
          <li>
            <button
              type="button"
              aria-label="Новый проект"
              onClick={() => {
                voice.say('Новый проект');
                router.push('/play/workshop');
              }}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[28px] border-4 border-dashed border-white bg-white/40 text-ink-soft"
            >
              <Plus aria-hidden size={56} strokeWidth={3} />
              <span className="text-xl font-extrabold">Новый проект</span>
            </button>
          </li>
          {(projects ?? []).map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-2 rounded-[28px] bg-surface p-3 shadow-[0_5px_0_var(--color-line)]"
            >
              <button
                type="button"
                aria-label={`Открыть: ${project.title}`}
                onClick={() => router.push(`/play/workshop/${project.id}`)}
                className="overflow-hidden rounded-2xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG preview */}
                <img
                  src={svgDataUrl(sceneThumbnailSvg(project.scene))}
                  alt=""
                  className="aspect-[4/3] w-full object-contain"
                  draggable={false}
                />
              </button>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xl font-black">{project.title}</span>
                {project.sharedAt ? (
                  <Send aria-label="Отправлено родителю" size={22} className="text-brand" />
                ) : null}
              </div>
              <div className="flex justify-between gap-2">
                <KidButton
                  voiceLabel="Показать"
                  icon={Play}
                  tone="go"
                  round
                  onClick={() => router.push(`/play/show/${project.id}`)}
                />
                <KidButton
                  voiceLabel="Изменить"
                  icon={Pencil}
                  round
                  onClick={() => router.push(`/play/workshop/${project.id}`)}
                />
                <KidButton
                  voiceLabel="Удалить"
                  icon={Trash2}
                  tone="calm"
                  round
                  onClick={() => setDoomed(project)}
                />
              </div>
            </li>
          ))}
        </ul>
      </main>
      {doomed ? (
        <KidDialog
          open
          onOpenChange={(open) => !open && setDoomed(null)}
          title="Удалить проект?"
          description={doomed.title}
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-xl font-bold">«{doomed.title}» пропадёт насовсем.</p>
            <div className="flex gap-3">
              <KidButton
                voiceLabel="Оставить"
                caption="Оставить"
                tone="go"
                size="lg"
                onClick={() => setDoomed(null)}
              />
              <KidButton
                voiceLabel="Удалить"
                caption="Удалить"
                icon={Trash2}
                tone="calm"
                size="lg"
                onClick={() => {
                  sfx.remove();
                  void deleteProject(doomed.id);
                  setDoomed(null);
                }}
              />
            </div>
          </div>
        </KidDialog>
      ) : null}
    </div>
  );
}
