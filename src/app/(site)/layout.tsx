import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingChrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      {/* clearance for the floating toolbar */}
      <div className="h-[76px] sm:h-[84px]" aria-hidden />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
