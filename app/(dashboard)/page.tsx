import Link from "next/link";
import { ArrowRight, Sparkles, FileEdit, BarChart3, DollarSign, MousePointerClick, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [campaigns, totals] = await Promise.all([
    prisma.campaign.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { ads: { include: { performance: true } } },
    }),
    prisma.adPerformance.aggregate({
      _sum: { spend: true, leads: true, clicks: true },
    }),
  ]);

  const totalSpend = totals._sum.spend ?? 0;
  const totalLeads = totals._sum.leads ?? 0;
  const totalClicks = totals._sum.clicks ?? 0;
  const blendedCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <>
      <Header title="Overview" subtitle="Spend, leads, and recent campaigns at a glance." />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Hero / hello block */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Renovation Ads
          </p>
          <h2 className="font-display text-4xl tracking-tight max-w-2xl">
            <span className="italic">Authentic</span> ad creative,
            <br />
            built for contractors.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">
            Generate, A/B test, and audit Meta campaigns purpose-built for the home
            renovations vertical. Nothing publishes until you say so.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Button asChild>
              <Link href="/generate">
                <Sparkles className="h-4 w-4" />
                Generate a campaign
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/drafts">
                Review drafts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Total spend"
            value={formatCurrency(totalSpend)}
            icon={DollarSign}
          />
          <StatsCard
            label="Leads"
            value={totalLeads.toLocaleString()}
            icon={Users}
          />
          <StatsCard
            label="Clicks"
            value={totalClicks.toLocaleString()}
            icon={MousePointerClick}
          />
          <StatsCard
            label="Blended CPL"
            value={blendedCpl > 0 ? formatCurrency(blendedCpl) : "—"}
            icon={BarChart3}
          />
        </section>

        {/* Recent campaigns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium tracking-tight">Recent campaigns</h3>
            <Link
              href="/campaigns"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <FileEdit className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/generate">Generate your first</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {campaigns.map((c) => {
                const totalLeads = c.ads.reduce(
                  (s, a) => s + (a.performance?.leads ?? 0),
                  0
                );
                const totalSpend = c.ads.reduce(
                  (s, a) => s + (a.performance?.spend ?? 0),
                  0
                );
                return (
                  <Card key={c.id} className="p-4 hover:bg-accent/30 transition-colors">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {humanizeEnum(c.service)} · {c.location} · {c.ads.length} variants
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0 text-xs tabular-nums">
                        <div>
                          <div className="text-muted-foreground">Spend</div>
                          <div className="font-medium">{formatCurrency(totalSpend)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Leads</div>
                          <div className="font-medium">{totalLeads}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
