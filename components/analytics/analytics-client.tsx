"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Sparkles, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PerformanceChart, type VariantPerf } from "@/components/analytics/performance-chart";
import { AuditReport } from "@/components/analytics/audit-report";
import { toast } from "@/components/ui/sonner";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface AdRow {
  id: string;
  campaignId: string;
  variantLabel: string;
  status: string;
  campaign: { id: string; name: string; service: string; location: string };
  performance: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    cpc: number;
    cpl: number;
    ctr: number;
    roas: number;
    lastSyncedAt: string;
  } | null;
}

interface AuditState {
  reportMarkdown: string;
  recommendation: "SCALE" | "KILL" | "TEST_MORE";
  confidenceScore: number;
  winningVariant: string | null;
}

export function AnalyticsClient() {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AuditState | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/analytics");
    const json = await res.json();
    setAds(json.ads ?? []);
    if (!selectedCampaign && json.ads?.length) {
      setSelectedCampaign(json.ads[0].campaignId);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncMeta() {
    setSyncing(true);
    const t = toast.loading("Syncing insights from Meta…");
    try {
      const res = await fetch("/api/analytics", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Sync failed");
      }
      const json = await res.json();
      toast.success(`Synced ${json.synced}/${json.total} ads.`, { id: t });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg, { id: t });
    } finally {
      setSyncing(false);
    }
  }

  async function runAudit() {
    if (!selectedCampaign) return;
    setAuditing(true);
    setAudit(null);
    const t = toast.loading("Claude is auditing this campaign…");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaign }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Audit failed");
      }
      const json = (await res.json()) as AuditState;
      setAudit(json);
      toast.success("Audit ready.", { id: t });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audit failed";
      toast.error(msg, { id: t });
    } finally {
      setAuditing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <Card className="p-12 text-center max-w-md mx-auto">
        <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium">No live ads yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Approve a draft and publish it to see performance here.
        </p>
      </Card>
    );
  }

  // Group ads by campaign
  const campaigns = Array.from(
    ads.reduce((map, a) => {
      if (!map.has(a.campaignId)) map.set(a.campaignId, a.campaign);
      return map;
    }, new Map<string, AdRow["campaign"]>())
  ).map(([campaignId, c]) => ({ id: campaignId, ...c }));

  const filtered = ads.filter((a) => a.campaignId === selectedCampaign);
  const chartData: VariantPerf[] = filtered.map((a) => ({
    variantLabel: a.variantLabel,
    spend: a.performance?.spend ?? 0,
    leads: a.performance?.leads ?? 0,
    cpl: a.performance?.cpl ?? 0,
    ctr: a.performance?.ctr ?? 0,
    roas: a.performance?.roas ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pick a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px]">
            {filtered.length} variants
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncMeta} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync Meta
          </Button>
          <Button size="sm" onClick={runAudit} disabled={auditing}>
            {auditing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Auditing…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate AI Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Performance grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4"
      >
        <PerformanceChart data={chartData} />
        <Card className="p-5 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Variant breakdown
          </div>
          {filtered.map((a) => {
            const p = a.performance;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between text-xs tabular-nums py-2 border-b border-border/40 last:border-0"
              >
                <Badge variant="outline" className="font-mono text-[10px]">
                  {a.variantLabel}
                </Badge>
                <div className="flex gap-4 text-right">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Spend</div>
                    <div>{p ? formatCurrency(p.spend) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">CPL</div>
                    <div>{p && p.cpl > 0 ? formatCurrency(p.cpl) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">CTR</div>
                    <div>{p ? formatPercent(p.ctr) : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </motion.div>

      {audit && (
        <AuditReport
          reportMarkdown={audit.reportMarkdown}
          recommendation={audit.recommendation}
          confidenceScore={audit.confidenceScore}
          winningVariant={audit.winningVariant}
        />
      )}

      {!audit && (
        <Card className="p-6 border-dashed">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium">No audit yet for this campaign</div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Click <span className="font-medium">Generate AI Audit</span> and Claude will
                analyse the variants using contractor-vertical benchmarks (CPL, CTR, lead
                quality) and tell you which to scale and which to kill.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
