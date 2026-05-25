import { cn } from "@/lib/cn";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...rest }: LabelProps) {
  return (
    <label
      className={cn(
        "text-micro uppercase font-medium text-ink-soft block",
        className,
      )}
      {...rest}
    />
  );
}
