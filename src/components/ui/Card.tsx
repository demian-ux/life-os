import { cn } from "@/lib/cn";

type CardVariant =
  | "default"
  | "lifted"
  | "flat"
  | "sunken"
  | "inset"
  | "elevated";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const VARIANTS: Record<CardVariant, string> = {
  default:
    "bg-bg-raised border border-cream-200 rounded-md p-[18px] shadow-tactile",
  lifted:
    "border border-cream-200 rounded-md p-[18px] shadow-tactile " +
    "[background:linear-gradient(180deg,#FFFFFF_0%,#FFF8E8_100%)] " +
    "[box-shadow:var(--shadow-tactile),inset_0_1px_0_rgba(255,255,255,0.8)]",
  flat:
    "bg-cream-100 border border-cream-200 rounded-md p-[18px]",
  sunken:
    "bg-cream-50 border border-dashed border-cream-300 rounded-md p-[18px]",
  // Legacy aliases — kept until every screen is migrated
  inset:
    "bg-bg-raised border border-cream-200 rounded-md overflow-hidden",
  elevated:
    "bg-bg-raised border border-cream-200 rounded-md p-[18px] shadow-tactile " +
    "hover:[box-shadow:var(--shadow-2),0_2px_0_rgba(91,74,51,0.10)] transition-shadow duration-150",
};

export function Card({ className, variant = "default", ...rest }: CardProps) {
  return <div className={cn(VARIANTS[variant], className)} {...rest} />;
}
