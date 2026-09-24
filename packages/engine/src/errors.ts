export type RuntimeErrorCode =
  | 'too_many_threads'
  | 'too_many_steps'
  | 'too_many_clones'
  | 'unknown_block'
  | 'unknown_actor'
  | 'unsupported_scene'
  | 'internal';

/** Child-facing explanations. The hero says these, so they are short and kind. */
export const RUNTIME_ERROR_MESSAGES: Record<RuntimeErrorCode, string> = {
  too_many_threads: 'Слишком много программ сразу. Давай уберём лишние!',
  too_many_steps: 'Программа крутится без остановки. Добавь «подожди» внутрь!',
  too_many_clones: 'Клонов стало слишком много. Я остановился.',
  unknown_block: 'Я не знаю такой блок. Попробуй другой.',
  unknown_actor: 'Этого героя нет на сцене.',
  unsupported_scene: 'Эта сцена пока не поддерживается.',
  internal: 'Что-то пошло не так. Попробуй ещё раз!',
};

export class EngineError extends Error {
  constructor(
    readonly code: RuntimeErrorCode,
    readonly blockId?: string,
  ) {
    super(RUNTIME_ERROR_MESSAGES[code]);
    this.name = 'EngineError';
  }
}
