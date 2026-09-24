import { avatarBackground, avatarSvg, characterSvg, svgDataUrl } from '@stepkids/stage/art';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Character art as an <img>; decorative unless `alt` is given. */
export function CharacterArt({
  character,
  costume = 'default',
  className,
  alt = '',
}: {
  character: string;
  costume?: string;
  className?: string;
  alt?: string;
}) {
  const src = useMemo(() => svgDataUrl(characterSvg(character, costume)), [character, costume]);
  // eslint-disable-next-line @next/next/no-img-element -- inline SVG data, nothing to optimise
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={cn('select-none', className)}
    />
  );
}

export function Avatar({ avatarId, className }: { avatarId: string; className?: string }) {
  const src = useMemo(() => svgDataUrl(avatarSvg(avatarId)), [avatarId]);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{ background: avatarBackground(avatarId) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data */}
      <img src={src} alt="" draggable={false} className="h-[86%] w-[86%] select-none" />
    </span>
  );
}
