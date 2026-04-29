"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Sparkles, Loader2, DollarSign, Wrench, Tag, Upload,
  Video, Image as ImageIcon, X, Check, Globe, Users,
  ChevronDown, MapPin, Zap, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Lazy-load map (no SSR)
const CoverageMap = dynamic(
  () => import("./coverage-map").then((m) => m.CoverageMap),
  { ssr: false, loading: () => (
    <div className="h-[280px] rounded-xl bg-secondary animate-pulse flex items-center justify-center">
      <span className="text-xs text-muted-foreground">Loading map…</span>
    </div>
  )}
);

type CreativeMode = "ai" | "upload";

interface UploadedFile {
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
}

// Service-based audience defaults
const SERVICE_AUDIENCE_DEFAULTS: Record<string, { ageMin: number; ageMax: number; gender: string }> = {
  KITCHEN_REMODEL:        { ageMin: 30, ageMax: 60, gender: "all" },
  BATHROOM_REMODEL:       { ageMin: 30, ageMax: 60, gender: "all" },
  WHOLE_HOME_RENOVATION:  { ageMin: 35, ageMax: 65, gender: "all" },
  ROOM_ADDITION:          { ageMin: 30, ageMax: 60, gender: "all" },
  BASEMENT_FINISHING:     { ageMin: 30, ageMax: 55, gender: "all" },
  ROOFING:                { ageMin: 35, ageMax: 65, gender: "male" },
  SIDING:                 { ageMin: 35, ageMax: 65, gender: "all" },
  WINDOWS_DOORS:          { ageMin: 30, ageMax: 65, gender: "all" },
  DECK_PATIO:             { ageMin: 30, ageMax: 60, gender: "all" },
  GARAGE_CONVERSION:      { ageMin: 30, ageMax: 60, gender: "all" },
  ADU_CONSTRUCTION:       { ageMin: 35, ageMax: 65, gender: "all" },
  COMMERCIAL_FITOUT:      { ageMin: 30, ageMax: 60, gender: "all" },
};

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-accent shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

export function GenerationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Campaign basics
  const [campaignName, setCampaignName] = useState("");
  const [service, setService] = useState<ServiceTypeValue | "">("");
  const [offer, setOffer] = useState<OfferTypeValue | "">("");
  const [dailyBudget, setDailyBudget] = useState("50");
  const [destinationUrl, setDestinationUrl] = useState("");

  // Geo targeting
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update audience defaults when service changes
  function handleServiceChange(v: ServiceTypeValue) {
    setService(v);
    const defaults = SERVICE_AUDIENCE_DEFAULTS[v];
    if (defaults) {
      setAgeMin(defaults.ageMin);
      setAgeMax(defaults.ageMax);
      setGender(defaults.gender);
    }
  }

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase();
    return EDINBURGH_LOCATIONS.filter(
      (l) =>
        !selectedLocations.find((s) => s.id === l.id) &&
        (l.label.toLowerCase().includes(q) || l.group.toLowerCase().includes(q))
    );
  }, [locationSearch, selectedLocations]);

  const estimatedReach = useMemo(
    () => estimateReach(selectedLocations, radiusMiles),
    [selectedLocations, radiusMiles]
  );

  function addLocation(loc: GeoLocation) {
    if (selectedLocations.length >= 5) {
      toast.error("Maximum 5 locations per campaign.");
      return;
    }
    setSelectedLocations((prev) => [...prev, loc]);
    setLocationSearch("");
    setShowLocationDropdown(false);
  }

  function removeLocation(id: string) {
    setSelectedLocations((prev) => prev.filter((l) => l.id !== id));
  }

  async function uploadFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { toast.error("Only image or video files accepted."); return; }
    if (uploadedFiles.length >= 3) { toast.error("Maximum 3 files (one per variant)."); return; }
    setUploading(true);
    const t = toast.loading(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("adId", `pre-${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
      const json = await res.json();
      setUploadedFiles((prev) => [...prev, { url: json.url, type: json.type, name: file.name, size: file.size }]);
      toast.success(`${file.name} uploaded.`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: t });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName || !service || !offer) { toast.error("Please fill in all campaign fields."); return; }
    if (selectedLocations.length === 0) { toast.error("Select at least one target location."); return; }
    const budget = Number(dailyBudget);
    if (!Number.isFinite(budget) || budget < 5) { toast.error("Daily budget must be at least £5."); return; }
    if (!destinationUrl) { toast.error("Please enter a destination website URL."); return; }
    if (creativeMode === "upload" && uploadedFiles.length === 0) { toast.error("Upload at least one image or video."); return; }

    setSubmitting(true);
    const t = toast.loading("Claude is drafting 3 variants…");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName, service, offer,
          location: selectedLocations.map((l) => l.label).join(", "),
          dailyBudget: budget,
          destinationUrl,
          geoTargeting: {
            locations: selectedLocations.map((l) => ({
              id: l.id, label: l.label, lat: l.lat, lng: l.lng,
              metaKey: l.metaKey, metaName: l.metaName,
              metaCountryCode: l.metaCountryCode, metaRegionId: l.metaRegionId,
            })),
            radiusMiles,
          },
          audience: { ageMin, ageMax, gender },
          publishActive,
          uploadedFiles: creativeMode === "upload" ? uploadedFiles : [],
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Failed (${res.status})`);
      const data = await res.json();
      toast.success("3 variants drafted!", { id: t });
      router.push(`/drafts?campaign=${data.campaignId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.", { id: t });
      setSubmitting(false);
    }
  }

  const fileSizeLabel = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)}KB` : `${(b / (1024 * 1024)).toFixed(1)}MB`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 1. Campaign basics ── */}
        <Card className="p-6 gold-glow">
          <SectionHeader icon={Sparkles} title="Campaign" subtitle="Name this campaign and pick the service and offer." />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign name</Label>
              <Input id="name" placeholder="Stockbridge Kitchen Remodel — Q3 2026"
                value={campaignName} onChange={(e) => setCampaignName(e.target.value)} disabled={submitting} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Destination URL
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 bg-white" placeholder="https://yoursite.co.uk"
                    value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} disabled={submitting} />
                </div>
                <p className="text-[11px] text-muted-foreground">Shown as your domain in the ad. Links here on click.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Daily budget
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                  <Input type="number" min={5} step={5} className="pl-7 bg-white tabular-nums"
                    value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} disabled={submitting} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2. Geo targeting ── */}
        <Card className="p-6">
          <SectionHeader icon={MapPin} title="Geographic targeting"
            subtitle="Select the areas you want to reach. Pre-validated for Meta." />
          <div className="space-y-4">
            {/* Location search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target locations</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 bg-white"
                  placeholder="Search Edinburgh areas…"
                  value={locationSearch}
                  onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                  onFocus={() => setShowLocationDropdown(true)}
                  disabled={submitting}
                />
                {showLocationDropdown && filteredLocations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                    {LOCATION_GROUPS.filter(g => filteredLocations.some(l => l.group === g)).map((group) => (
                      <div key={group}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">
                          {group}
                        </div>
                        {filteredLocations.filter(l => l.group === group).map((loc) => (
                          <button key={loc.id} type="button"
                            onClick={() => addLocation(loc)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            {loc.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Click outside to close dropdown */}
              {showLocationDropdown && (
                <div className="fixed inset-0 z-40" onClick={() => setShowLocationDropdown(false)} />
              )}
            </div>

            {/* Selected location badges */}
            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((loc) => (
                  <Badge key={loc.id} variant="outline"
                    className="gap-1.5 pr-1 py-1 border-primary/20 bg-accent text-foreground">
                    <MapPin className="h-3 w-3 text-primary" />
                    {loc.label}
                    <button type="button" onClick={() => removeLocation(loc.id)}
                      className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Radius selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Radius per location
              </Label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r.value} type="button"
                    onClick={() => setRadiusMiles(r.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      radiusMiles === r.value
                        ? "border-primary bg-accent text-primary gold-glow"
                        : "border-border bg-white text-muted-foreground hover:border-primary/30"
                    )}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coverage map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coverage map</Label>
                {selectedLocations.length > 0 && estimatedReach > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Est. reach: <span className="font-semibold text-primary">~{formatCompact(estimatedReach)} people</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <CoverageMap
                  locations={selectedLocations}
                  radiusMiles={radiusMiles}
                  className="h-[280px] w-full"
                />
              </div>
              {selectedLocations.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Select a location above to see your coverage area on the map.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ── 3. Audience ── */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAudience(!showAudience)}
            className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-accent shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Audience targeting</div>
                <div className="text-xs text-muted-foreground">
                  {gender === "all" ? "All genders" : gender === "male" ? "Male" : "Female"} · Ages {ageMin}–{ageMax}
                  {service && <span className="text-primary ml-1">· Auto-set for {SERVICE_OPTIONS.find(s => s.value === service)?.label}</span>}
                </div>
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showAudience && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showAudience && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border"
              >
                <div className="p-6 space-y-5">
                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gender</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "all", label: "All genders" },
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                      ].map((g) => (
                        <button key={g.value} type="button"
                          onClick={() => setGender(g.value)}
                          className={cn(
                            "py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                            gender === g.value
                              ? "border-primary bg-accent text-primary"
                              : "border-border bg-white text-muted-foreground hover:border-primary/30"
                          )}>
                          {gender === g.value && <Check className="inline h-3 w-3 mr-1" />}
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age range */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Age range: <span className="text-primary font-semibold">{ageMin} – {ageMax}</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] text-muted-foreground">Minimum age</div>
                        <Select value={String(ageMin)} onValueChange={(v) => setAgeMin(Number(v))}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[18,21,25,30,35,40,45,50].map((a) => (
                              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-muted-foreground">Maximum age</div>
                        <Select value={String(ageMax)} onValueChange={(v) => setAgeMax(Number(v))}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[40,45,50,55,60,65].map((a) => (
                              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {service && (
                      <div className="flex items-start gap-2 rounded-lg bg-accent border border-primary/10 p-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground">
                          Auto-set for <strong className="text-foreground">{SERVICE_OPTIONS.find(s => s.value === service)?.label}</strong>. Adjust if you know your client&apos;s customer profile.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ── 4. Creative ── */}
        <Card className="p-6">
          <SectionHeader icon={ImageIcon} title="Creative" subtitle="Use AI-generated visuals or upload your own." />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: "ai" as CreativeMode, icon: Sparkles, title: "AI generated", desc: "Gemini renders authentic cell-phone style photos" },
                { mode: "upload" as CreativeMode, icon: Upload, title: "Your own files", desc: "Images or videos from your real jobs" },
              ]).map(({ mode, icon: Icon, title, desc }) => (
                <button key={mode} type="button" onClick={() => setCreativeMode(mode)}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                    creativeMode === mode
                      ? "border-primary/40 bg-accent gold-glow"
                      : "border-border bg-white hover:border-primary/20 hover:bg-secondary/30"
                  )}>
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
                  <div
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(uploadFile); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
                      dragOver ? "border-primary bg-accent/50" : "border-border hover:border-primary/40 hover:bg-secondary/20",
                      uploading && "pointer-events-none opacity-60"
                    )}>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files ?? []).forEach(uploadFile)} />
                    {uploading ? (
                      <><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Uploading…</span></>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">Drop files here or click to browse</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Up to 3 files · Images or videos · 200MB max per video</p>
                        </div>
                      </>
                    )}
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent border border-primary/10">
                            {f.type === "video" ? <Video className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{f.name}</div>
                            <div className="text-[11px] text-muted-foreground">{f.type} · {fileSizeLabel(f.size)} · <span className="text-emerald-600">Uploaded</span></div>
                          </div>
                          {f.type === "image" && <img src={f.url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border" />}
                          {f.type === "video" && <video src={f.url} className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border" muted />}
                          <button type="button" onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}
                            className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground">
                        {uploadedFiles.length === 1 ? "Used for all 3 variants." : uploadedFiles.length === 2 ? "File 1 → A & C · File 2 → B." : "One file per variant (A, B, C)."}
                      </p>
                    </div>
                  )}
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
              className={cn(
                "mt-0.5 flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all",
                publishActive ? "border-primary bg-primary" : "border-border bg-white"
              )}>
              <span className={cn(
                "h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                publishActive ? "translate-x-3.5" : "translate-x-0.5"
              )} />
            </button>
            <div>
              <div className="text-sm font-medium">
                {publishActive ? "Publish as Active immediately" : "Publish as Paused (review in Ads Manager first)"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {publishActive
                  ? "Ads go live and start spending the moment you click Approve & Publish. No Ads Manager step needed."
                  : "Ads are created in Meta but paused. You flip them to Active in Ads Manager when ready. Recommended for first campaigns."}
              </p>
            </div>
          </div>
        </Card>

        {/* ── Submit ── */}
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-xs text-muted-foreground max-w-sm">
            Claude drafts 3 A/B variants with different angles.
            {creativeMode === "ai" ? " Gemini renders the creative." : " Your uploaded files are used as creative."}
            {" "}Nothing publishes until you approve.
          </p>
          <Button type="submit" disabled={submitting || uploading} size="lg" className="shrink-0">
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Drafting…</>
              : <><Sparkles className="h-4 w-4" />Generate 3 variants</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
