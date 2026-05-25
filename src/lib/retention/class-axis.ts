import type { TraitAxis } from "@prisma/client";
import type { ClassKey } from "@/components/ui/Sigil";

/**
 * Map the structured TraitAxis enum to the visual ClassKey used by Sigil /
 * tone helpers. This is a stable design mapping — DON'T change without
 * coordinating with the seed data and the design system.
 */
const AXIS_TO_CLASS: Record<TraitAxis, ClassKey> = {
  DISCIPLINE: "body",
  FOCUS: "mind",
  AUDACITY: "money",
  CRAFT: "craft",
  RECOVERY: "bonds",
};

export function classFromAxis(axis: TraitAxis): ClassKey {
  return AXIS_TO_CLASS[axis] ?? "craft";
}

const CLASS_TONE: Record<ClassKey, "coral" | "sky" | "gold" | "leaf" | "plum"> = {
  body: "coral",
  mind: "sky",
  money: "gold",
  craft: "leaf",
  bonds: "plum",
};

export function toneFromClass(classKey: ClassKey) {
  return CLASS_TONE[classKey];
}

export function toneFromAxis(axis: TraitAxis) {
  return CLASS_TONE[classFromAxis(axis)];
}
