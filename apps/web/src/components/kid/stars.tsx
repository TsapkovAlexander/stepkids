import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Earned stars out of three; the empty ones stay visible so the goal is clear. */
export function Stars({
  count,
  size = 20,
  className,
  animate = false,
}: {
  count: number;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`Звёзд: ${count} из 3`}
      role="img"
    >
      {[0, 1, 2].map((index) => (
        <Star
          key={index}
          aria-hidden
          size={size}
          strokeWidth={2.5}
          className={cn(
            index < count ? 'fill-sun text-sun-dark' : 'fill-white/70 text-ink/25',
            animate && index < count && 'animate-pop',
          )}
          style={
            animate ? { animationDelay: `${index * 220}ms`, animationFillMode: 'both' } : undefined
          }
        />
      ))}
    </span>
  );
}
