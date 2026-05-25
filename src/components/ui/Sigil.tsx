import Image from "next/image";
import { cn } from "@/lib/cn";

export type ClassKey = "body" | "mind" | "money" | "craft" | "bonds";

const LABELS: Record<ClassKey, string> = {
  body: "Body class",
  mind: "Mind class",
  money: "Money class",
  craft: "Craft class",
  bonds: "Bonds class",
};

type SigilProps = {
  classKey: ClassKey;
  size?: number;
  className?: string;
};

/**
 * Class sigil — one SVG per life domain. Decorative; alt text spells out
 * the class for screen readers.
 */
export function Sigil({ classKey, size = 36, className }: SigilProps) {
  return (
    <Image
      src={`/lifeos/class-${classKey}.svg`}
      alt={LABELS[classKey]}
      width={size}
      height={size}
      className={cn("block", className)}
    />
  );
}
