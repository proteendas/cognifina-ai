import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const severityStyles: Record<Severity, string> = {
  critical: "border-transparent bg-danger-soft text-danger",
  high: "border-transparent bg-[#faeee4] text-[#c05f1d]",
  medium: "border-transparent bg-warning-soft text-warning",
  low: "border-transparent bg-info-soft text-info",
  info: "border-line-strong bg-transparent text-ink-3",
};

export function Badge({
  className,
  severity,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { severity?: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider [&_svg]:h-3 [&_svg]:w-3 w-fit",
        severity ? severityStyles[severity] : "border-line-strong bg-surface-2 text-ink-3",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
