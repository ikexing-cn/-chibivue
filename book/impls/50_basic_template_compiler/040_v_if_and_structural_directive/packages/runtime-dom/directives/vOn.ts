import { hyphenate } from "../../shared";

const systemModifiers = ["ctrl", "shift", "alt", "meta"];

type KeyedEvent = KeyboardEvent | MouseEvent | TouchEvent;

const modifierGuards: Record<
  string,
  (e: Event, modifiers: string[]) => void | boolean
> = {
  stop: (e) => e.stopPropagation(),
  prevent: (e) => e.preventDefault(),
  self: (e) => e.target !== e.currentTarget,
  ctrl: (e) => !(e as KeyedEvent).ctrlKey,
  shift: (e) => !(e as KeyedEvent).shiftKey,
  alt: (e) => !(e as KeyedEvent).altKey,
  meta: (e) => !(e as KeyedEvent).metaKey,
  left: (e) => "button" in e && (e as MouseEvent).button !== 0,
  middle: (e) => "button" in e && (e as MouseEvent).button !== 1,
  right: (e) => "button" in e && (e as MouseEvent).button !== 2,
  exact: (e, modifiers) =>
    systemModifiers.some(
      (m) => (e as any)[`${m}Key`] && !modifiers.includes(m)
    ),
};

export const withModifiers = (fn: Function, modifiers: string[]) => {
  return (event: Event, ...args: unknown[]) => {
    for (let i = 0; i < modifiers.length; i++) {
      const guard = modifierGuards[modifiers[i]];
      if (guard && guard(event, modifiers)) return;
    }
    return fn(event, ...args);
  };
};

const keyNames: Record<string, string | string[]> = {
  esc: "escape",
  space: " ",
  up: "arrow-up",
  left: "arrow-left",
  right: "arrow-right",
  down: "arrow-down",
  delete: "backspace",
};

export const withKeys = (fn: Function, modifiers: string[]) => {
  return (event: KeyboardEvent) => {
    if (!("key" in event)) {
      return;
    }

    const eventKey = hyphenate(event.key);
    if (modifiers.some((k) => k === eventKey || keyNames[k] === eventKey)) {
      return fn(event);
    }
  };
};
