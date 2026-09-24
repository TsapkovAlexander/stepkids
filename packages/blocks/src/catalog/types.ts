import type { Primitive } from '../ast';
import type { Tier } from '../level';

export const BLOCK_CATEGORIES = [
  'events',
  'motion',
  'looks',
  'sound',
  'control',
  'sensing',
  'operators',
  'data',
  'myblocks',
] as const;
export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

/** hat — starts a script; command — a step; wrapper — holds stacks; cap — ends a stack. */
export type BlockShape = 'hat' | 'command' | 'wrapper' | 'cap' | 'value' | 'condition';

/** Grammatical gender of the counted noun, so voices read "одну секунду", "два шага". */
export type NumeralGender = 'm' | 'f' | 'n';

export interface NounForms {
  /** 1, 21, 31… — "секунду" */
  one: string;
  /** 2–4, 22–24… — "секунды" */
  few: string;
  /** 0, 5–20… — "секунд" */
  many: string;
}

export interface ChoiceOption {
  value: string;
  label: string;
  /** lucide icon name */
  icon: string;
  voice: string;
}

interface ParamBase {
  name: string;
  /** Short spoken name of the parameter, used by the value picker. */
  voice: string;
}

export interface IntParam extends ParamBase {
  kind: 'int';
  min: number;
  max: number;
  default: number;
  gender: NumeralGender;
  unit?: NounForms;
}

export interface NumberParam extends ParamBase {
  kind: 'number';
  min?: number;
  max?: number;
  default: number;
}

export interface TextParam extends ParamBase {
  kind: 'text';
  maxLength: number;
  default: string;
  presets: string[];
}

export interface ChoiceParam extends ParamBase {
  kind: 'choice';
  options: ChoiceOption[];
  default: string;
}

/** Options come from the scene at edit time (costumes of the actor, sprites, messages…). */
export interface DynamicChoiceParam extends ParamBase {
  kind: 'dynamic';
  source: 'costumes' | 'actors' | 'messages' | 'variables' | 'lists' | 'procedures';
  default: string;
}

/** A reporter/condition slot (tiers 3+). */
export interface SlotParam extends ParamBase {
  kind: 'slot';
  accepts: 'value' | 'condition';
  default?: Primitive;
}

export type ParamDef =
  IntParam | NumberParam | TextParam | ChoiceParam | DynamicChoiceParam | SlotParam;

/**
 * What the interpreter does. `primitive` names an executor primitive; `with` holds fixed
 * arguments merged under the block's own arguments. New blocks whose behaviour reduces to
 * existing primitives can be defined in the backoffice without touching code.
 */
export interface BlockBehavior {
  primitive: string;
  with?: Record<string, Primitive>;
}

export interface CodegenTemplates {
  /** `{param}` inserts an argument, `{STACK}` inserts an indented stack. */
  js: string;
  py: string;
}

export interface BlockDef {
  type: string;
  category: BlockCategory;
  tier: Tier;
  shape: BlockShape;
  /** lucide icon name */
  icon: string;
  /** Up to 12 characters — shown under the icon. */
  label: string;
  /** Spoken in the palette: "вправо". */
  voice: string;
  /** Spoken for a placed block: "вправо {count}". Params are rendered as words. */
  voiceTemplate?: string;
  params: ParamDef[];
  stacks?: string[];
  behavior: BlockBehavior;
  codegen: CodegenTemplates;
  /** Hidden from palettes but still executable (e.g. the implicit start of the ribbon). */
  hidden?: boolean;
  /**
   * How the block reads in the puzzle editor: "иди в x {x} y {y}". Defaults to the label
   * followed by its parameters.
   */
  text?: string;
}

export const LABEL_MAX_LENGTH = 12;
