import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent shadow-soft [&_svg]:h-[17px] [&_svg]:w-[17px]",
        className
      )}
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <g stroke="#C7F284" strokeWidth="5" strokeLinecap="round">
          <path d="M32 19v9M23.5 41.5L29 33.5M40.5 41.5L35 33.5" />
        </g>
        <circle cx="32" cy="15.5" r="6.5" fill="#C7F284" />
        <circle cx="21" cy="46" r="6.5" fill="#C7F284" />
        <circle cx="43" cy="46" r="6.5" fill="#C7F284" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[15px] font-semibold tracking-tight text-ink", className)}>
      Cognifina
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("pressable flex items-center gap-2.5", className)}>
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
