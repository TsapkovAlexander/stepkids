/**
 * What the hero says in system situations. Errors are part of the game: the hero never
 * "loses", it explains what happened in a friendly voice and goes back to the start.
 */

export type BumpReasonKey = 'edge' | 'rock' | 'tree' | 'water' | 'door';

export type ReactionKey =
  | 'win'
  | 'starsLeft'
  | 'notReached'
  | 'notSaid'
  | 'shapeMismatch'
  | 'variableMismatch'
  | 'tooSlow'
  | 'empty'
  | 'timeout'
  | 'error'
  | 'manual'
  | 'tryAgain'
  | 'hintReady';

export const BUMP_LINES: Record<BumpReasonKey, string[]> = {
  edge: ['Ой! Дальше дороги нет.', 'Ой, тут край полянки!'],
  rock: ['Ой, камень!', 'Ой! Тут камень на пути.'],
  tree: ['Ой, дерево!', 'Ой! Дерево мешает пройти.'],
  water: ['Ой, вода! Я не умею плавать.', 'Брр, мокро! Обойдём водичку.'],
  door: ['Дверь закрыта. Нужен ключик!', 'Заперто! Сначала найдём ключ.'],
};

export const REACTION_LINES: Record<ReactionKey, string[]> = {
  win: ['Ура! Получилось!', 'Молодец! Всё правильно!', 'Здорово! Ты справился!'],
  starsLeft: ['Ой, я собрал не все звёздочки.', 'Звёздочки ещё остались!'],
  notReached: ['Я не дошёл до флажка.', 'Флажок ещё впереди!'],
  notSaid: ['Я забыл сказать нужные слова.', 'А что нужно было сказать?'],
  shapeMismatch: ['Рисунок получился другой.', 'Посмотри на картинку ещё раз.'],
  variableMismatch: ['Число получилось другое.'],
  tooSlow: ['Я не успел! Попробуем быстрее.'],
  empty: ['Добавь блоки в программу!', 'Программа пустая. Нажми на блок внизу!'],
  timeout: ['Я устал ходить. Давай попробуем по-другому.'],
  error: ['Что-то пошло не так. Попробуем ещё раз!'],
  manual: ['Готово! Покажи родителю.'],
  tryAgain: ['Давай попробуем ещё раз!', 'Ничего страшного, попробуем снова!'],
  hintReady: ['Хочешь подсказку? Нажми на лампочку.'],
};

/** Deterministic pick so repeated attempts vary a little without randomness in tests. */
export function pickLine(lines: readonly string[], seed: number): string {
  if (lines.length === 0) return '';
  const index = Math.abs(Math.trunc(seed)) % lines.length;
  return lines[index] ?? lines[0] ?? '';
}
