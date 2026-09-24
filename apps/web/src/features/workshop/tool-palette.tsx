'use client';

import type { GridTheme } from '@stepkids/blocks';
import { GRID_THEMES } from '@stepkids/blocks';
import {
  THEMES,
  characterSvg,
  doorSvg,
  flagSvg,
  flowerSvg,
  keySvg,
  portalSvg,
  rockSvg,
  starSvg,
  svgDataUrl,
  treeSvg,
  waterSvg,
} from '@stepkids/stage/art';
import { Eraser } from 'lucide-react';
import { useMemo } from 'react';
import { radioTabIndex, rovingRadioKeyDown } from '@/components/kid/roving';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { WORKSHOP_TOOLS, type WorkshopTool } from '@/lib/workshop/scene-edit';

export const TOOL_NAMES: Record<WorkshopTool, string> = {
  hero: 'Герой',
  star: 'Звезда',
  rock: 'Камень',
  tree: 'Дерево',
  water: 'Вода',
  flag: 'Флажок',
  key: 'Ключ',
  door: 'Дверь',
  teleport: 'Окошко',
  flower: 'Цветы',
  eraser: 'Ластик',
};

const THEME_NAMES: Record<GridTheme, string> = {
  meadow: 'Полянка',
  forest: 'Лес',
  beach: 'Пляж',
  snow: 'Зима',
  candy: 'Конфеты',
};

function toolArt(tool: WorkshopTool, theme: GridTheme, heroId: string): string | null {
  const tree = THEMES[theme].tree;
  const svg: Record<Exclude<WorkshopTool, 'eraser'>, () => string> = {
    hero: () => characterSvg(heroId),
    star: starSvg,
    rock: rockSvg,
    tree: () => treeSvg(tree),
    water: waterSvg,
    flag: flagSvg,
    key: () => keySvg('yellow'),
    door: () => doorSvg('yellow', false),
    teleport: portalSvg,
    flower: flowerSvg,
  };
  return tool === 'eraser' ? null : svgDataUrl(svg[tool]());
}

/** Things the child can put on the field by tapping a cell, plus the eraser and field themes. */
export function ToolPalette({
  tool,
  onTool,
  theme,
  onTheme,
  heroId,
}: {
  tool: WorkshopTool;
  onTool: (tool: WorkshopTool) => void;
  theme: GridTheme;
  onTheme: (theme: GridTheme) => void;
  heroId: string;
}) {
  const arts = useMemo(
    () => Object.fromEntries(WORKSHOP_TOOLS.map((entry) => [entry, toolArt(entry, theme, heroId)])),
    [theme, heroId],
  );
  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Что поставить"
        onKeyDown={rovingRadioKeyDown}
        className="flex flex-wrap justify-center gap-2 rounded-3xl bg-white/60 p-2"
      >
        {WORKSHOP_TOOLS.map((entry, index) => {
          const art = arts[entry];
          return (
            <button
              key={entry}
              type="button"
              role="radio"
              aria-checked={tool === entry}
              aria-label={TOOL_NAMES[entry]}
              tabIndex={radioTabIndex(index, WORKSHOP_TOOLS.indexOf(tool))}
              onClick={() => {
                voice.say(TOOL_NAMES[entry]);
                onTool(entry);
              }}
              className={cn(
                'kid-press flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-surface [--press-edge:var(--color-line)]',
                tool === entry && 'ring-4 ring-brand',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG art */}
              {art ? (
                <img src={art} alt="" className="h-12 w-12" draggable={false} />
              ) : (
                <Eraser aria-hidden size={34} />
              )}
            </button>
          );
        })}
      </div>
      <div
        role="radiogroup"
        aria-label="Фон"
        onKeyDown={rovingRadioKeyDown}
        className="flex flex-wrap justify-center gap-2"
      >
        {GRID_THEMES.map((entry, index) => (
          <button
            key={entry}
            type="button"
            role="radio"
            aria-checked={theme === entry}
            aria-label={THEME_NAMES[entry]}
            tabIndex={radioTabIndex(index, GRID_THEMES.indexOf(theme))}
            onClick={() => {
              voice.say(THEME_NAMES[entry]);
              onTheme(entry);
            }}
            className={cn(
              'h-target w-target rounded-full border-4',
              theme === entry ? 'border-brand' : 'border-white',
            )}
            style={{
              background: `linear-gradient(135deg, ${THEMES[entry].tileA} 50%, ${THEMES[entry].board} 50%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
