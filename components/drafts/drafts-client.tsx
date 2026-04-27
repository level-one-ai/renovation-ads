"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, CheckCircle2, Trash2, Loader2, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MobilePreview } from "@/components/drafts/mobile-preview";
import { EditDrawer } from "@/components/drafts/edit-drawer";
import { toast } from "@/components/ui/sonner";
import { humanizeEnum } from "@/lib/utils";

interface AdRow {
  id: string;
  campaignId: string;
  variantLabel: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  imagePrompt: string;
  imageUrl: string | null;
  beforeAfterUrl: string | null;
  useBeforeAfter: boolean;
  videoUrl: string | null;
  useVideo: boolean;
  status: string;
  campaign: {
    id: string;
    name: string;
    location: string;
    service: string;
  };
}

export function DraftsClient() {
  const params = useSearchParams();
  const filterCampaign = params.get("campaign");
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = new URL("/api/ads", window.location.origin);
    url.searchParams.set("status", "DRAFT");
    if (filterCampaign) url.searchParams.set("campaign", filterCampaign);
    const res = await fetch(url.toString());
    const json = await res.json();
    setAds(json.ads ?? []);
    if (json.ads?.length && !activeId) setActiveId(json.ads[0].id);
    setLoading(false);
  }, [filterCampaign, activeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh after image generation (poll briefly)
  useEffect(() => {
    if (!filterCampaign) return;
    const hasMissingImages = ads.some((a) => !a.imageUrl);
    if (!hasMissingImages) return;
    const t = setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [filterCampaign, ads, load]);

  const active = ads.find((a) => a.id === activeId) ?? null;

  async function publish(id: string) {
    setPublishing(id);
    const t = toast.loading("Publishing to Meta…");
    try {
      const res = await fetch(`/api/ads/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Publish failed");
      }
      toast.success("Live on Meta (paused state — enable in Ads Manager).", { id: t });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish failed";
      toast.error(msg, { id: t });
    } finally {
      setPublishing(null);
    }
  }

  async function discard(id: string) {
    if (!confirm("Discard this draft?")) return;
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    toast.success("Draft discarded.");
    setActiveId(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-12 text-center max-w-sm">
          <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">No drafts in the queue.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a campaign to fill this up.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Variant list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {ads.length} draft{ads.length === 1 ? "" : "s"}
          </p>
          <Button variant="ghost" size="sm" onClick={load} className="h-7 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <AnimatePresence>
          {ads.map((ad) => (
            <motion.button
              key={ad.id}
              layout
              onClick={() => setActiveId(ad.id)}
              className={`block w-full text-left rounded-lg border p-3 transition-colors ${
                activeId === ad.id
                  ? "border-foreground/30 bg-accent/50"
                  : "border-border/60 hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {ad.variantLabel}
                </Badge>
                {!ad.imageUrl && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> rendering image
                  </span>
                )}
              </div>
              <div className="text-sm font-medium truncate">{ad.headline}</div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {ad.campaign.name} · {humanizeEnum(ad.campaign.service)}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Active preview */}
      {active && (
        <Tabs defaultValue="preview" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="preview">Mobile preview</TabsTrigger>
              <TabsTrigger value="prompt">Image prompt</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => discard(active.id)}
                className="text-muted-foreground hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingAd(active)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => publish(active.id)}
                disabled={publishing === active.id || !active.imageUrl}
              >
                {publishing === active.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Publish
                  </>
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="preview">
            <MobilePreview
              pageName={active.campaign.name}
              headline={active.headline}
              primaryText={active.primaryText}
              description={active.description}
              ctaButton={active.ctaButton}
              imageUrl={
                active.useBeforeAfter && active.beforeAfterUrl
                  ? active.beforeAfterUrl
                  : active.imageUrl
              }
              videoUrl={active.videoUrl}
              useVideo={active.useVideo}
              variantLabel={active.variantLabel}
              service={active.campaign.service}
              location={active.campaign.location}
            />
          </TabsContent>

          <TabsContent value="prompt">
            <Card className="p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Gemini image prompt
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/80">
                {active.imagePrompt}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {editingAd && (
        <EditDrawer
          ad={editingAd}
          open={!!editingAd}
          onOpenChange={(o) => !o && setEditingAd(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
