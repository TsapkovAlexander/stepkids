import type { KeyboardEvent } from 'react';

/**
 * Keyboard support for radio groups (one canon for every group): arrows move and select,
 * Home/End jump. Put it on the element with role="radiogroup".
 */
export function rovingRadioKeyDown(event: KeyboardEvent<HTMLElement>): void {
  const radios = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="radio"]:not([aria-disabled="true"])',
    ),
  ];
  if (radios.length === 0) return;
  const current = radios.indexOf(document.activeElement as HTMLElement);
  const last = radios.length - 1;
  const moves: Record<string, number> = {
    ArrowRight: (current + 1) % radios.length,
    ArrowDown: (current + 1) % radios.length,
    ArrowLeft: (current - 1 + radios.length) % radios.length,
    ArrowUp: (current - 1 + radios.length) % radios.length,
    Home: 0,
    End: last,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  radios[next]?.focus();
  radios[next]?.click();
}

/** Tab stop of a radio: the selected one, or the first when nothing is selected. */
export function radioTabIndex(index: number, selectedIndex: number): 0 | -1 {
  return index === (selectedIndex === -1 ? 0 : selectedIndex) ? 0 : -1;
}
