'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { createChallenge, isCorrect, type Challenge } from '@/lib/lock/challenge';
import { PIN_LENGTH, verifyPin } from '@/lib/lock/pin';
import { getPin } from '@/lib/storage/family';
import { KidButton } from './kid-button';
import { KidDialog } from './kid-dialog';
import { NumberPad } from './number-pad';

interface GateState {
  onPass: () => void;
  challenge: Challenge;
}

/**
 * Parent lock: a PIN when the family set one, otherwise a multiplication an adult solves
 * instantly. Returns `requestPass(onPass)` and the dialog element to render.
 */
export function useParentGate(): { requestPass: (onPass: () => void) => void; gate: ReactNode } {
  const [state, setState] = useState<GateState | null>(null);
  const requestPass = useCallback(
    (onPass: () => void) => setState({ onPass, challenge: createChallenge() }),
    [],
  );
  const gate = state ? (
    <ParentGateDialog
      key={`${state.challenge.a}x${state.challenge.b}`}
      challenge={state.challenge}
      onClose={() => setState(null)}
      onPass={() => {
        const { onPass } = state;
        setState(null);
        onPass();
      }}
    />
  ) : null;
  return { requestPass, gate };
}

function ParentGateDialog({
  challenge,
  onClose,
  onPass,
}: {
  challenge: Challenge;
  onClose: () => void;
  onPass: () => void;
}) {
  const pin = useLiveQuery(() => getPin(), [], undefined);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const usesPin = !!pin;

  const submit = async () => {
    const ok = pin ? await verifyPin(value, pin) : isCorrect(challenge, value);
    if (ok) onPass();
    else {
      setWrong(true);
      setValue('');
    }
  };

  return (
    <KidDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Для взрослых"
      description="Родительский замок: введите ответ, чтобы продолжить"
    >
      <p className="mb-4 text-center text-lg font-bold text-ink-soft" aria-live="polite">
        {usesPin ? 'Введите PIN-код' : `Сколько будет ${challenge.a} × ${challenge.b}?`}
        {wrong ? (
          <span className="mt-1 block text-base text-ink">Неверно, попробуйте ещё раз</span>
        ) : null}
      </p>
      <NumberPad
        value={value}
        onChange={(next) => {
          setWrong(false);
          setValue(next);
        }}
        maxLength={usesPin ? PIN_LENGTH : 3}
        secret={usesPin}
        label={usesPin ? 'PIN-код' : 'Ответ'}
      />
      <div className="mt-5 flex justify-center">
        <KidButton
          voiceLabel="Готово"
          tone="go"
          size="lg"
          icon={Check}
          caption="Готово"
          silent
          disabled={!value}
          onClick={() => void submit()}
        />
      </div>
    </KidDialog>
  );
}
