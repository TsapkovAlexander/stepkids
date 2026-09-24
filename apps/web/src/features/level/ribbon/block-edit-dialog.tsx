'use client';

import {
  speakBlock,
  speakNumber,
  type BlockDef,
  type BlockNode,
  type ParamDef,
  type Primitive,
} from '@stepkids/blocks';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { KidButton } from '@/components/kid/kid-button';
import { KidDialog } from '@/components/kid/kid-dialog';
import { rovingRadioKeyDown } from '@/components/kid/roving';
import { blockIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { categoryStyle } from './block-style';

export interface BlockEditDialogProps {
  def: BlockDef;
  block: BlockNode;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onChange: (name: string, value: Primitive) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Tap on a placed block: change its number/phrase/melody, move it, or remove it (the cross). */
export function BlockEditDialog({
  def,
  block,
  canMoveLeft,
  canMoveRight,
  onChange,
  onMove,
  onDelete,
  onClose,
}: BlockEditDialogProps) {
  return (
    <KidDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={def.label}
      description={speakBlock(def, block)}
    >
      <div className="flex flex-col gap-5">
        {def.params.map((param) => (
          <ParamPicker
            key={param.name}
            def={def}
            param={param}
            value={block.args?.[param.name]}
            onChange={(value) => {
              onChange(param.name, value);
              voice.say(
                speakBlock(def, { ...block, args: { ...block.args, [param.name]: value } }),
              );
            }}
          />
        ))}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <KidButton
            voiceLabel="Сдвинуть влево"
            icon={ArrowLeft}
            disabled={!canMoveLeft}
            onClick={() => onMove(-1)}
          />
          <KidButton
            voiceLabel="Убрать блок"
            icon={Trash2}
            caption="Убрать"
            tone="calm"
            size="lg"
            onClick={onDelete}
          />
          <KidButton
            voiceLabel="Сдвинуть вправо"
            icon={ArrowRight}
            disabled={!canMoveRight}
            onClick={() => onMove(1)}
          />
        </div>
      </div>
    </KidDialog>
  );
}

function ParamPicker({
  def,
  param,
  value,
  onChange,
}: {
  def: BlockDef;
  param: ParamDef;
  value: unknown;
  onChange: (value: Primitive) => void;
}) {
  switch (param.kind) {
    case 'int': {
      const numbers = Array.from({ length: param.max - param.min + 1 }, (_, i) => param.min + i);
      return (
        <Choices label={param.voice}>
          {numbers.map((n, i) => (
            <Choice
              key={n}
              selected={value === n}
              tabStop={i === 0 && !numbers.includes(Number(value))}
              label={speakNumber(n, param.gender, param.unit)}
              onPick={() => onChange(n)}
              style={categoryStyle(def.category)}
            >
              <span className="text-3xl font-black">{n}</span>
              <Dots count={n} />
            </Choice>
          ))}
        </Choices>
      );
    }
    case 'choice':
      return (
        <Choices label={param.voice}>
          {param.options.map((option, i) => {
            const Icon = blockIcon(option.icon);
            return (
              <Choice
                key={option.value}
                selected={value === option.value}
                tabStop={i === 0 && !param.options.some((entry) => entry.value === value)}
                label={option.voice}
                onPick={() => onChange(option.value)}
                style={categoryStyle(def.category)}
                wide
              >
                <Icon aria-hidden size={30} strokeWidth={3} />
                <span className="text-sm font-extrabold">{option.label}</span>
              </Choice>
            );
          })}
        </Choices>
      );
    case 'text':
      return (
        <PhrasePicker
          def={def}
          presets={param.presets}
          maxLength={param.maxLength}
          value={String(value ?? '')}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function PhrasePicker({
  def,
  presets,
  maxLength,
  value,
  onChange,
}: {
  def: BlockDef;
  presets: string[];
  maxLength: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const [own, setOwn] = useState(presets.includes(value) ? '' : value);
  return (
    <div className="flex flex-col gap-3">
      <Choices label="Что сказать">
        {presets.map((phrase, i) => (
          <Choice
            key={phrase}
            selected={value === phrase}
            tabStop={i === 0 && !presets.includes(value)}
            label={phrase}
            onPick={() => onChange(phrase)}
            style={categoryStyle(def.category)}
            wide
          >
            <span className="text-lg font-black">{phrase}</span>
          </Choice>
        ))}
      </Choices>
      <label className="flex flex-col gap-1 text-base font-bold text-ink-soft">
        Или напиши сам:
        <input
          value={own}
          maxLength={maxLength}
          onChange={(event) => setOwn(event.target.value)}
          onBlur={() => own.trim() && onChange(own.trim())}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && own.trim()) onChange(own.trim());
          }}
          className="min-h-target rounded-2xl border-2 border-line bg-surface px-4 text-xl font-extrabold text-ink outline-none focus:border-brand"
        />
      </label>
    </div>
  );
}

function Choices({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={rovingRadioKeyDown} className="flex flex-wrap justify-center gap-2">
      {children}
    </div>
  );
}

function Choice({
  selected,
  label,
  onPick,
  children,
  style,
  wide,
  tabStop,
}: {
  selected: boolean;
  /** Tab stop of the group when nothing is selected. */
  tabStop?: boolean;
  label: string;
  onPick: () => void;
  children: React.ReactNode;
  style: React.CSSProperties;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      tabIndex={selected || tabStop ? 0 : -1}
      onClick={onPick}
      style={style}
      className={cn(
        'kid-press flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-ink',
        wide ? 'min-w-24' : 'w-16',
        selected && 'ring-4 ring-ink',
      )}
    >
      {children}
    </button>
  );
}

function Dots({ count }: { count: number }) {
  if (count > 5) return null;
  return (
    <span aria-hidden className="flex gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink" />
      ))}
    </span>
  );
}
