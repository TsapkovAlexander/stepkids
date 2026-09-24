'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { AvatarPicker } from '@/components/kid/avatar-picker';
import { KidButton } from '@/components/kid/kid-button';
import { KidDialog } from '@/components/kid/kid-dialog';
import { PROFILE_NAME_MAX, createProfile } from '@/lib/storage/profiles';
import type { Profile } from '@/lib/storage/types';

/** Parents add a child: a name and an avatar — no e-mail, no password. */
export function AddProfileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (profile: Profile) => void;
}) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('kitten');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = await createProfile({ name, avatarId });
      setName('');
      onCreated(profile);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не получилось сохранить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KidDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Новый игрок"
      description="Имя и аватар ребёнка"
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="flex flex-col gap-2 text-lg font-bold">
          Имя
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={PROFILE_NAME_MAX}
            autoComplete="off"
            required
            className="min-h-target rounded-2xl border-2 border-line bg-surface px-4 text-2xl font-extrabold outline-none focus:border-brand"
            placeholder="Например, Маша"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-lg font-bold">Аватар</span>
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        </div>
        {error ? (
          <p role="alert" className="font-bold text-ink">
            {error}
          </p>
        ) : null}
        <KidButton
          type="submit"
          voiceLabel="Готово"
          tone="go"
          size="lg"
          icon={Check}
          caption="Готово"
          silent
          disabled={busy || !name.trim()}
          className="self-center"
        />
      </form>
    </KidDialog>
  );
}
