import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, humanizeEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  DRAFT: "outline",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "secondary",
  ARCHIVED: "secondary",
};

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { ads: { include: { performance: true } } },
  });

  return (
    <>
      <Header
        title="Campaigns"
        subtitle={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} across all statuses.`}
      />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8">
        {campaigns.length === 0 ? (
          <Card className="p-12 text-center max-w-md mx-auto">
            <Megaphone className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No campaigns yet.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Generate your first campaign to get started.
            </p>
            <Button asChild size="sm">
              <Link href="/generate">Generate a campaign</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 max-w-5xl">
            {campaigns.map((c) => {
              const totalSpend = c.ads.reduce(
                (s, a) => s + (a.performance?.spend ?? 0),
                0
              );
              const totalLeads = c.ads.reduce(
                (s, a) => s + (a.performance?.leads ?? 0),
                0
              );
              const liveAds = c.ads.filter((a) => a.status === "LIVE").length;
              return (
                <Card key={c.id} className="p-5 hover:bg-accent/30 transition-colors">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{c.name}</span>
                        <Badge
                          variant={statusVariant[c.status] ?? "outline"}
                          className="text-[10px] font-mono"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                        <span>{humanizeEnum(c.service)}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{c.location}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{formatCurrency(c.dailyBudget)}/day</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{humanizeEnum(c.offer)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-xs tabular-nums">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Variants
                        </div>
                        <div className="font-medium mt-0.5">
                          {liveAds}/{c.ads.length} live
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Spend
                        </div>
                        <div className="font-medium mt-0.5">{formatCurrency(totalSpend)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Leads
                        </div>
                        <div className="font-medium mt-0.5">{totalLeads}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
