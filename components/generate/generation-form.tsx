"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Sparkles, Loader2, DollarSign, Wrench, Tag, Upload,
  Video, Image as ImageIcon, X, Check, Globe, Users,
  ChevronDown, MapPin, Zap, Search, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { cn, formatCompact } from "@/lib/utils";
import { SERVICE_OPTIONS, OFFER_OPTIONS } from "@/types";
import type { ServiceTypeValue, OfferTypeValue } from "@/types";
import {
  EDINBURGH_LOCATIONS, LOCATION_GROUPS, RADIUS_OPTIONS,
  estimateReach, type GeoLocation,
} from "@/lib/edinburgh-locations";

const CoverageMap = dynamic(
  () => import("./coverage-map").then((m) => m.CoverageMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] rounded-xl bg-secondary animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    ),
  }
);

type CreativeMode = "ai" | "upload";

interface UploadedFile {
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
  description: string;
}

const SERVICE_AUDIENCE_DEFAULTS: Record<string, { ageMin: number; ageMax: number; gender: string }> = {
  KITCHEN_REMODEL:       { ageMin: 30, ageMax: 60, gender: "all" },
  BATHROOM_REMODEL:      { ageMin: 30, ageMax: 60, gender: "all" },
  WHOLE_HOME_RENOVATION: { ageMin: 35, ageMax: 65, gender: "all" },
  ROOM_ADDITION:         { ageMin: 30, ageMax: 60, gender: "all" },
  BASEMENT_FINISHING:    { ageMin: 30, ageMax: 55, gender: "all" },
  ROOFING:               { ageMin: 35, ageMax: 65, gender: "male" },
  SIDING:                { ageMin: 35, ageMax: 65, gender: "all" },
  WINDOWS_DOORS:         { ageMin: 30, ageMax: 65, gender: "all" },
  DECK_PATIO:            { ageMin: 30, ageMax: 60, gender: "all" },
  GARAGE_CONVERSION:     { ageMin: 30, ageMax: 60, gender: "all" },
  ADU_CONSTRUCTION:      { ageMin: 35, ageMax: 65, gender: "all" },
  COMMERCIAL_FITOUT:     { ageMin: 30, ageMax: 60, gender: "all" },
};

function SectionHeader({ icon: Icon, title, subtitle, badge }: {
  icon: React.ElementType; title: string; subtitle?: string; badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-accent shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {badge && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">{badge}</Badge>}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

function FileSizeLabel({ bytes }: { bytes: number }) {
  const label = bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)}KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return <span>{label}</span>;
}

export function GenerationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Campaign basics
  const [campaignName, setCampaignName] = useState("");
  const [service, setService] = useState<ServiceTypeValue | "">("");
  const [offer, setOffer] = useState<OfferTypeValue | "">("");
  const [dailyBudget, setDailyBudget] = useState("60");
  const [destinationUrl, setDestinationUrl] = useState("");

  // Geo
  const [selectedLocations, setSelectedLocations] = useState<GeoLocation[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Audience
  const [ageMin, setAgeMin] = useState(30);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState("all");
  const [showAudience, setShowAudience] = useState(false);

  // Publishing
  const [publishActive, setPublishActive] = useState(false);

  // Creative
  const [creativeMode, setCreativeMode] = useState<CreativeMode>("ai");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleServiceChange(v: ServiceTypeValue) {
    setService(v);
    const d = SERVICE_AUDIENCE_DEFAULTS[v];
    if (d) { setAgeMin(d.ageMin); setAgeMax(d.ageMax); setGender(d.gender); }
  }

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase();
    return EDINBURGH_LOCATIONS.filter(
      (l) => !selectedLocations.find((s) => s.id === l.id) &&
        (l.label.toLowerCase().includes(q) || l.group.toLowerCase().includes(q))
    );
  }, [locationSearch, selectedLocations]);

  const estimatedReach = useMemo(
    () => estimateReach(selectedLocations, radiusMiles),
    [selectedLocations, radiusMiles]
  );

  const budgetPerAd = dailyBudget ? (Number(dailyBudget) / 2).toFixed(2) : "0.00";

  function addLocation(loc: GeoLocation) {
    if (selectedLocations.length >= 5) { toast.error("Maximum 5 locations."); return; }
    setSelectedLocations((p) => [...p, loc]);
    setLocationSearch("");
    setShowLocationDropdown(false);
  }

  async function uploadFile(file: File, slot: number) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { toast.error("Only image or video files accepted."); return; }

    setUploading(true);
    const t = toast.loading(`Uploading Ad ${slot === 0 ? "A" : "B"}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("adId", `pre-${Date.now()}-${slot}`);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
      const json = await res.json();
      const newFile: UploadedFile = { url: json.url, type: json.type, name: file.name, size: file.size, description: "" };
      setUploadedFiles((prev) => {
        const updated = [...prev];
        updated[slot] = newFile;
        return updated;
      });
      toast.success(`Ad ${slot === 0 ? "A" : "B"} uploaded.`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: t });
    } finally {
      setUploading(false);
    }
  }

  function updateDescription(slot: number, desc: string) {
    setUploadedFiles((prev) => {
      const updated = [...prev];
      if (updated[slot]) updated[slot] = { ...updated[slot], description: desc };
      return updated;
    });
  }

  function removeFile(slot: number) {
    setUploadedFiles((prev) => {
      const updated = [...prev];
      delete updated[slot];
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName || !service || !offer) { toast.error("Fill in all campaign fields."); return; }
    if (selectedLocations.length === 0) { toast.error("Select at least one location."); return; }
    const budget = Number(dailyBudget);
    if (!Number.isFinite(budget) || budget < 10) { toast.error("Daily budget must be at least £10 (£5 per ad)."); return; }
    if (!destinationUrl) { toast.error("Enter a destination website URL."); return; }
    if (creativeMode === "upload") {
      const validFiles = uploadedFiles.filter(Boolean);
      if (validFiles.length === 0) { toast.error("Upload at least one image or video."); return; }
      const missingDesc = validFiles.findIndex((f) => !f.description.trim());
      if (missingDesc !== -1) {
        toast.error(`Add a description for Ad ${missingDesc === 0 ? "A" : "B"} so Claude can write matching copy.`);
        return;
      }
    }

    setSubmitting(true);
    const t = toast.loading("Claude is crafting 2 variants…");
    try {
      const validFiles = uploadedFiles.filter(Boolean);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName, service, offer,
          location: selectedLocations.map((l) => l.label).join(", "),
          dailyBudget: budget,
          destinationUrl,
          geoTargeting: { locations: selectedLocations.map((l) => ({
            id: l.id, label: l.label, lat: l.lat, lng: l.lng,
            metaKey: l.metaKey, metaName: l.metaName,
            metaCountryCode: l.metaCountryCode, metaRegionId: l.metaRegionId,
          })), radiusMiles },
          audience: { ageMin, ageMax, gender },
          publishActive,
          uploadedFiles: creativeMode === "upload" ? validFiles : [],
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Failed (${res.status})`);
      const data = await res.json();
      toast.success(`2 variants drafted · £${data.budgetPerAd}/day each`, { id: t });
      router.push(`/drafts?campaign=${data.campaignId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.", { id: t });
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 1. Campaign ── */}
        <Card className="p-6 gold-glow">
          <SectionHeader icon={Sparkles} title="Campaign" subtitle="Name this campaign and pick the service and offer." />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaign name</Label>
              <Input placeholder="Stockbridge Kitchen Remodel — Q3 2026"
                value={campaignName} onChange={(e) => setCampaignName(e.target.value)} disabled={submitting} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Service
                </Label>
                <Select value={service} onValueChange={(v) => handleServiceChange(v as ServiceTypeValue)} disabled={submitting}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Offer
                </Label>
                <Select value={offer} onValueChange={(v) => setOffer(v as OfferTypeValue)} disabled={submitting}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Select offer" /></SelectTrigger>
                  <SelectContent>
                    {OFFER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex flex-col items-start">
                          <span>{o.label}</span>
                          <span className="text-[10px] text-muted-foreground">{o.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_180px] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Destination URL
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 bg-white" placeholder="https://yoursite.co.uk"
                    value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} disabled={submitting} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Daily budget
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                  <Input type="number" min={10} step={5} className="pl-6 bg-white tabular-nums"
                    value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} disabled={submitting} />
                </div>
                {Number(dailyBudget) > 0 && (
                  <p className="text-[11px] text-primary font-medium">
                    £{budgetPerAd}/day per ad (split 50/50)
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2. Geo targeting ── */}
        <Card className="p-6">
          <SectionHeader icon={MapPin} title="Geographic targeting" subtitle="Select areas to reach. Pre-validated for Meta." />
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
              <Input className="pl-8 bg-white" placeholder="Search Edinburgh areas…"
                value={locationSearch}
                onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                onFocus={() => setShowLocationDropdown(true)}
                disabled={submitting} />
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                  {LOCATION_GROUPS.filter((g) => filteredLocations.some((l) => l.group === g)).map((group) => (
                    <div key={group}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">{group}</div>
                      {filteredLocations.filter((l) => l.group === group).map((loc) => (
                        <button key={loc.id} type="button" onClick={() => addLocation(loc)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />{loc.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {showLocationDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLocationDropdown(false)} />}

            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((loc) => (
                  <Badge key={loc.id} variant="outline" className="gap-1.5 pr-1 py-1 border-primary/20 bg-accent">
                    <MapPin className="h-3 w-3 text-primary" />{loc.label}
                    <button type="button" onClick={() => setSelectedLocations((p) => p.filter((l) => l.id !== loc.id))}
                      className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radius per location</Label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRadiusMiles(r.value)}
                    className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      radiusMiles === r.value ? "border-primary bg-accent text-primary gold-glow" : "border-border bg-white text-muted-foreground hover:border-primary/30")}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage map</Label>
                {selectedLocations.length > 0 && estimatedReach > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Est. reach: <span className="font-semibold text-primary">~{formatCompact(estimatedReach)} people</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <CoverageMap locations={selectedLocations} radiusMiles={radiusMiles} className="h-[280px] w-full" />
              </div>
              {selectedLocations.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center">Select a location to see your coverage area.</p>
              )}
            </div>
          </div>
        </Card>

        {/* ── 3. Audience ── */}
        <Card className="overflow-hidden">
          <button type="button" onClick={() => setShowAudience(!showAudience)}
            className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-accent shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Audience targeting</div>
                <div className="text-xs text-muted-foreground">
                  {gender === "all" ? "All genders" : gender === "male" ? "Male" : "Female"} · Ages {ageMin}–{ageMax}
                  {service && <span className="text-primary ml-1">· Auto-set for {SERVICE_OPTIONS.find((s) => s.value === service)?.label}</span>}
                </div>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showAudience && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showAudience && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border">
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gender</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ value: "all", label: "All genders" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }].map((g) => (
                        <button key={g.value} type="button" onClick={() => setGender(g.value)}
                          className={cn("py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                            gender === g.value ? "border-primary bg-accent text-primary" : "border-border bg-white text-muted-foreground hover:border-primary/30")}>
                          {gender === g.value && <Check className="inline h-3 w-3 mr-1" />}{g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Age range: <span className="text-primary">{ageMin}–{ageMax}</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] text-muted-foreground">Minimum</div>
                        <Select value={String(ageMin)} onValueChange={(v) => setAgeMin(Number(v))}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[18,21,25,30,35,40,45,50].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-muted-foreground">Maximum</div>
                        <Select value={String(ageMax)} onValueChange={(v) => setAgeMax(Number(v))}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[40,45,50,55,60,65].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ── 4. Creative ── */}
        <Card className="p-6">
          <SectionHeader icon={ImageIcon} title="Creative" subtitle="AI-generated visuals or upload your own videos and images." />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: "ai" as CreativeMode, icon: Sparkles, title: "AI generated", desc: "Gemini renders authentic cell-phone style photos" },
                { mode: "upload" as CreativeMode, icon: Upload, title: "Your own files", desc: "Upload 2 of your own videos or images" },
              ]).map(({ mode, icon: Icon, title, desc }) => (
                <button key={mode} type="button" onClick={() => setCreativeMode(mode)}
                  className={cn("relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                    creativeMode === mode ? "border-primary/40 bg-accent gold-glow" : "border-border bg-white hover:border-primary/20 hover:bg-secondary/30")}>
                  {creativeMode === mode && (
                    <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full gold-gradient">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <Icon className={cn("h-4 w-4", creativeMode === mode ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {creativeMode === "upload" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-3">

                  {/* Budget reminder */}
                  <div className="flex items-center gap-2 rounded-lg bg-accent border border-primary/10 px-3 py-2">
                    <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Daily budget splits equally: <strong className="text-foreground">£{budgetPerAd}/day for Ad A</strong> and <strong className="text-foreground">£{budgetPerAd}/day for Ad B</strong>.
                    </p>
                  </div>

                  {/* Two upload slots */}
                  {[0, 1].map((slot) => {
                    const file = uploadedFiles[slot];
                    const label = slot === 0 ? "Ad A" : "Ad B";
                    return (
                      <div key={slot} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md gold-gradient">
                              <span className="text-[10px] font-bold text-white">{slot === 0 ? "A" : "B"}</span>
                            </div>
                            <span className="text-sm font-semibold">{label}</span>
                            {!file && <Badge variant="outline" className="text-[10px]">Not uploaded</Badge>}
                            {file && <Badge variant="success" className="text-[10px]">Uploaded</Badge>}
                          </div>
                          {file && (
                            <button type="button" onClick={() => removeFile(slot)} className="text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {!file ? (
                          <div
                            onDrop={(e) => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, slot); }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(slot); }}
                            onDragLeave={() => setDragOver(null)}
                            onClick={() => fileInputRefs[slot].current?.click()}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all",
                              dragOver === slot ? "border-primary bg-accent/50" : "border-border hover:border-primary/40 hover:bg-white",
                              uploading && "pointer-events-none opacity-60"
                            )}>
                            <input ref={fileInputRefs[slot]} type="file" accept="image/*,video/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, slot); }} />
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">Upload {label} creative</span>
                            <span className="text-xs text-muted-foreground">Video or image · max 200MB</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            {file.type === "image" && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={file.url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0 border border-border" />
                            )}
                            {file.type === "video" && (
                              <video src={file.url} className="h-16 w-16 rounded-lg object-cover shrink-0 border border-border" muted />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{file.name}</div>
                              <div className="text-[11px] text-muted-foreground mb-2">
                                {file.type} · <FileSizeLabel bytes={file.size} />
                              </div>
                              <button type="button" onClick={() => fileInputRefs[slot].current?.click()}
                                className="text-[11px] text-primary hover:underline">
                                Replace file
                              </button>
                              <input ref={fileInputRefs[slot]} type="file" accept="image/*,video/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, slot); }} />
                            </div>
                          </div>
                        )}

                        {/* Description field — shown once file is uploaded */}
                        {file && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                              <FileText className="h-3 w-3" /> Describe this creative
                            </Label>
                            <Textarea
                              rows={2}
                              placeholder={`e.g. "Before and after kitchen reveal showing new marble worktops and painted cabinets"`}
                              value={file.description}
                              onChange={(e) => updateDescription(slot, e.target.value)}
                              className="bg-white text-sm resize-none"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Claude uses this to write copy that matches your visual. Be specific.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <p className="text-[11px] text-muted-foreground text-center">
                    You can upload just Ad A and Ad B will use the same creative — or upload both for a true A/B test.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* ── 5. Publishing ── */}
        <Card className="p-6">
          <SectionHeader icon={Zap} title="Publishing" subtitle="Control how ads go live after you approve them." />
          <div className="flex items-start gap-4 rounded-xl border border-border bg-secondary/20 p-4">
            <button type="button" onClick={() => setPublishActive(!publishActive)}
              className={cn("mt-0.5 flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all",
                publishActive ? "border-primary bg-primary" : "border-border bg-white")}>
              <span className={cn("h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                publishActive ? "translate-x-3.5" : "translate-x-0.5")} />
            </button>
            <div>
              <div className="text-sm font-medium">
                {publishActive ? "Publish as Active immediately on approval" : "Publish as Paused — review in Ads Manager first"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {publishActive
                  ? "Ads go live and start spending the moment you click Approve & Publish."
                  : "Ads are created in Meta but paused. Flip to Active in Ads Manager when ready."}
              </p>
            </div>
          </div>
        </Card>

        {/* ── Submit ── */}
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-xs text-muted-foreground max-w-sm">
            Claude drafts 2 variants with different angles.
            {creativeMode === "ai" ? " Gemini renders the creative." : " Your uploaded files are used as creative."}
            {" "}Nothing publishes until you approve.
          </p>
          <Button type="submit" disabled={submitting || uploading} size="lg" className="shrink-0">
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Drafting…</>
              : <><Sparkles className="h-4 w-4" />Generate 2 variants</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
