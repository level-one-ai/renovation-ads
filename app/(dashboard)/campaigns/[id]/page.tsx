import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, DollarSign, Tag, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercent, humanizeEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      ads: {
        include: { performance: true, auditReports: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { variantLabel: "asc" },
      },
    },
  });

  if (!campaign) notFound();

  const totalSpend = campaign.ads.reduce((s, a) => s + (a.performance?.spend ?? 0), 0);
  const totalLeads = campaign.ads.reduce((s, a) => s + (a.performance?.leads ?? 0), 0);
  const blendedCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <>
      <Header title={campaign.name} subtitle={`Campaign · ${humanizeEnum(campaign.service)}`} />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 space-y-8 max-w-6xl">
        <div>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All campaigns
          </Link>
        </div>

        {/* Meta block */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl tracking-tight">{campaign.name}</h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {campaign.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                <Detail icon={Wrench} label="Service" value={humanizeEnum(campaign.service)} />
                <Detail icon={MapPin} label="Location" value={campaign.location} />
                <Detail
                  icon={DollarSign}
                  label="Daily budget"
                  value={formatCurrency(campaign.dailyBudget)}
                />
                <Detail icon={Tag} label="Offer" value={humanizeEnum(campaign.offer)} />
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm tabular-nums">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total spend
                </div>
                <div className="font-display text-xl mt-0.5">{formatCurrency(totalSpend)}</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Leads
                </div>
                <div className="font-display text-xl mt-0.5">{totalLeads}</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Blended CPL
                </div>
                <div className="font-display text-xl mt-0.5">
                  {blendedCpl > 0 ? formatCurrency(blendedCpl) : "—"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Variants */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium tracking-tight">
              Variants · {campaign.ads.length}
            </h3>
            <Button asChild size="sm" variant="outline">
              <Link href={`/drafts?campaign=${campaign.id}`}>Open in drafts</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {campaign.ads.map((ad) => {
              const p = ad.performance;
              return (
                <Card key={ad.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {ad.variantLabel}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {ad.status}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-medium">{ad.headline}</div>
                    <div className="text-xs text-muted-foreground line-clamp-3 mt-1.5">
                      {ad.primaryText}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
                    <Stat label="Spend" value={p ? formatCurrency(p.spend) : "—"} />
                    <Stat label="Leads" value={p ? String(p.leads) : "—"} />
                    <Stat label="CPL" value={p && p.cpl > 0 ? formatCurrency(p.cpl) : "—"} />
                    <Stat label="CTR" value={p ? formatPercent(p.ctr) : "—"} />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-foreground/90">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}
