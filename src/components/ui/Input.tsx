import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full bg-cream-50 text-ink-800 rounded-[10px] border-[1.5px] border-cream-300 " +
  "px-3 py-[9px] font-[var(--font-body)] text-[14px] " +
  "placeholder:text-cream-400 " +
  "transition-colors duration-[120ms] " +
  "focus:outline-none focus:border-coral-500 focus:ring-[3px] focus:ring-[rgba(238,106,77,0.18)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-[color:var(--danger-500)] aria-[invalid=true]:focus:ring-[color:rgba(200,74,63,0.18)]";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return <input className={cn(FIELD_BASE, className)} {...rest} />;
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(FIELD_BASE, "resize-y min-h-20 leading-[1.5]", className)}
      {...rest}
    />
  );
}
