import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-sm text-ink shadow-[0_1px_2px_rgba(26,29,31,0.03)] outline-none transition placeholder:text-ink-4 focus:border-accent/50 focus:ring-2 focus:ring-accent/15",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_2px_rgba(26,29,31,0.03)] outline-none transition resize-none placeholder:text-ink-4 focus:border-accent/50 focus:ring-2 focus:ring-accent/15",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}
