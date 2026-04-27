"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, MapPin, DollarSign, Wrench, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { SERVICE_OPTIONS, OFFER_OPTIONS } from "@/types";
import type { ServiceTypeValue, OfferTypeValue } from "@/types";

export function GenerationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [service, setService] = useState<ServiceTypeValue | "">("");
  const [location, setLocation] = useState("");
  const [dailyBudget, setDailyBudget] = useState<string>("50");
  const [offer, setOffer] = useState<OfferTypeValue | "">("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!campaignName || !service || !location || !offer) {
      toast.error("Please fill in every field.");
      return;
    }
    const budget = Number(dailyBudget);
    if (!Number.isFinite(budget) || budget < 5) {
      toast.error("Daily budget must be at least $5.");
      return;
    }

    setSubmitting(true);
    const t = toast.loading("Claude is drafting 3 variants…");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          service,
          location,
          dailyBudget: budget,
          offer,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      toast.success("3 variants drafted. Generating images now…", { id: t });
      router.push(`/drafts?campaign=${data.campaignId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg, { id: t });
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="campaignName" className="flex items-center gap-1.5">
              <span>Campaign name</span>
            </Label>
            <Input
              id="campaignName"
              placeholder="Stockbridge Kitchen Remodel — Q3 2026"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Internal label only. Helps you find this campaign later.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Service
              </Label>
              <Select
                value={service}
                onValueChange={(v) => setService(v as ServiceTypeValue)}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Offer
              </Label>
              <Select
                value={offer}
                onValueChange={(v) => setOffer(v as OfferTypeValue)}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick an offer" />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col items-start">
                        <span>{o.label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {o.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-5">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Micro-geographic location
              </Label>
              <Input
                id="location"
                placeholder="Stockbridge, Edinburgh"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Neighbourhood or suburb works far better than &quot;UK-wide&quot;.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Daily budget
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="budget"
                  type="number"
                  min={5}
                  step={5}
                  className="pl-6 tabular-nums"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <p className="text-xs text-muted-foreground max-w-xs">
              Claude drafts 3 variants. Gemini generates a candid-photo creative for each.
              Nothing publishes until you approve.
            </p>
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate 3 variants
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
