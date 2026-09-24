'use client';

import { defaultCatalog, type GridSceneInput } from '@stepkids/blocks';
import type { GridStage, StageMarkers } from '@stepkids/stage';
import { Blocks, Grid3x3, Map as MapIcon, Maximize2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { KidButton } from '@/components/kid/kid-button';
import { sfx } from '@/lib/audio/sfx';
import { insertBlock } from '@/lib/ribbon/ops';
import { useDeviceSettings } from '@/lib/settings';
import { useRequireProfile } from '@/lib/use-require-profile';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { sandboxLevel } from '@/lib/workshop/sandbox-level';
import { applyTool, setTheme, type Cell, type WorkshopTool } from '@/lib/workshop/scene-edit';
import { ProgramPanel } from '../level/program-panel';
import { RunControls } from '../level/run-controls';
import { StageView } from '../level/stage-view';
import { useLevelPlayer } from '../level/use-level-player';
import { TOOL_NAMES, ToolPalette } from './tool-palette';
import { useProject } from './use-project';

type Mode = 'field' | 'program';

export function WorkshopScreen({ projectId }: { projectId: string }) {
  const router = useRouter();
  const profile = useRequireProfile();
  const { project, setScene, setProgram, update } = useProject(projectId);
  const [mode, setMode] = useState<Mode>('program');
  const [tool, setTool] = useState<WorkshopTool>('star');
  const [pendingPortal, setPendingPortal] = useState<Cell | null>(null);
  const [stage, setStage] = useState<GridStage | null>(null);
  const { speed } = useDeviceSettings();

  const tier = profile?.currentTier ?? 1;
  const palette = useMemo(() => defaultCatalog.upToTier(tier === 1 ? 1 : 2).filter((def) => def.shape !== 'hat'), [tier]);
  const scene = project?.scene;
  const level = useMemo(() => (scene ? sandboxLevel(scene, palette.map((def) => def.type)) : null), [scene, palette]);
  const markers = useMemo<StageMarkers>(() => (pendingPortal ? { reach: [pendingPortal] } : {}), [pendingPortal]);

  if (project === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <KidButton voiceLabel="Мои проекты" caption="Проект не найден" tone="brand" onClick={() => router.push('/play/projects')} />
      </div>
    );
  }
  if (!profile || !project || !level || !scene) return <div className="flex-1 animate-pulse bg-white/30" aria-busy />;

  return (
    <WorkshopBody
      key={project.id}
      title={project.title}
      scene={scene}
      level={level}
      markers={markers}
      stage={stage}
      setStage={setStage}
      speed={speed}
      mode={mode}
      setMode={setMode}
      tool={tool}
      setTool={setTool}
      heroId={profile.heroId}
      program={project.program}
      setProgram={setProgram}
      palette={palette}
      shared={!!project.sharedAt}
      onCell={(cell) => {
        if (mode !== 'field') return;
        const next = applyTool({ scene, pendingPortal }, tool, cell);
        setPendingPortal(next.pendingPortal);
        if (next.scene !== scene) {
          sfx.add();
          setScene(next.scene);
        } else if (next.pendingPortal) sfx.tap();
      }}
      onTheme={(theme) => setScene(setTheme(scene, theme))}
      onShare={() => {
        update({ sharedAt: Date.now() });
        voice.say('Отправили родителю! Он сможет превратить твоё поле в задание.');
      }}
      onBack={() => router.push('/play/map')}
      onShow={() => router.push(`/play/show/${project.id}`)}
    />
  );
}

interface BodyProps {
  title: string;
  scene: GridSceneInput;
  level: ReturnType<typeof sandboxLevel>;
  markers: StageMarkers;
  stage: GridStage | null;
  setStage: (stage: GridStage | null) => void;
  speed: number;
  mode: Mode;
  setMode: (mode: Mode) => void;
  tool: WorkshopTool;
  setTool: (tool: WorkshopTool) => void;
  heroId: string;
  program: NonNullable<ReturnType<typeof useProject>['project']>['program'];
  setProgram: ReturnType<typeof useProject>['setProgram'];
  palette: ReturnType<typeof defaultCatalog.upToTier>;
  shared: boolean;
  onCell: (cell: Cell) => void;
  onTheme: (theme: GridSceneInput['theme'] & string) => void;
  onShare: () => void;
  onBack: () => void;
  onShow: () => void;
}

function WorkshopBody(props: BodyProps) {
  const { level, markers, stage, speed, mode, program, setProgram } = props;
  const { state, player } = useLevelPlayer({ level, markers, stage, speed, onFinish: () => undefined, sandbox: true });
  const running = state.status !== 'idle';

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-2 sm:gap-3 sm:p-3 side:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]">
      <header className="flex flex-wrap items-center gap-2 side:col-span-2">
        <KidButton voiceLabel="На карту" icon={MapIcon} round onClick={props.onBack} />
        <h1 className="min-w-0 flex-1 truncate text-2xl font-black">{props.title}</h1>
        <div role="tablist" aria-label="Что делаем" className="flex gap-1 rounded-full bg-white/70 p-1">
          {(
            [
              { id: 'field', label: 'Поле', icon: Grid3x3 },
              { id: 'program', label: 'Программа', icon: Blocks },
            ] as const
          ).map((tab) => (
            <KidButton
              key={tab.id}
              role="tab"
              aria-selected={mode === tab.id}
              voiceLabel={tab.label}
              icon={tab.icon}
              caption={tab.label}
              tone={mode === tab.id ? 'brand' : 'surface'}
              className={cn(mode !== tab.id && 'bg-transparent shadow-none')}
              onClick={() => {
                if (tab.id === 'field') player?.stop();
                props.setMode(tab.id);
              }}
            />
          ))}
        </div>
        <KidButton voiceLabel={props.shared ? 'Уже отправлено родителю' : 'Отправить родителю'} icon={Send} round tone={props.shared ? 'surface' : 'sun'} silent onClick={props.onShare} />
        <KidButton voiceLabel="Показать на весь экран" icon={Maximize2} round onClick={props.onShow} />
      </header>
      <div className="relative min-h-[34dvh] side:row-span-2 side:min-h-0">
        <StageView
          className={cn('absolute inset-0 rounded-3xl', mode === 'field' && 'cursor-crosshair')}
          label="Поле мастерской"
          onReady={props.setStage}
          onCellTap={(cell) => {
            if (running) return;
            props.onCell(cell);
          }}
        />
        {mode === 'field' ? (
          <p className="pointer-events-none absolute top-2 left-2 rounded-full bg-white/85 px-3 py-1 text-base font-extrabold">
            Нажми на клетку: {TOOL_NAMES[props.tool]}
          </p>
        ) : null}
      </div>
      {mode === 'field' ? (
        <section aria-label="Предметы" className="min-h-0 overflow-y-auto side:col-start-2 side:row-span-2 side:row-start-2">
          <ToolPalette tool={props.tool} onTool={props.setTool} theme={props.scene.theme ?? 'meadow'} onTheme={props.onTheme} heroId={props.heroId} />
        </section>
      ) : (
        <ProgramPanel
          program={program}
          setProgram={setProgram}
          palette={props.palette}
          running={running}
          activeIds={state.activeIds}
          oopsId={state.oopsId}
          ghost={null}
          highlight={null}
          onPick={(type) => {
            if (running) {
              voice.say('Сначала нажми «Стоп»');
              return;
            }
            const def = defaultCatalog.get(type);
            sfx.add();
            if (def) voice.say(def.voice);
            setProgram((current) => insertBlock(current, defaultCatalog.create(type)));
          }}
          controls={
            <RunControls status={state.status} onPlay={() => player?.play(program)} onStop={() => player?.stop()} onStep={() => player?.step(program)} />
          }
        />
      )}
    </div>
  );
}
