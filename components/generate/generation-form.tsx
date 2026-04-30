"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Sparkles, Loader2, DollarSign, Wrench, Tag, Upload,
  Video, Image as ImageIcon, X, Check, Globe, Users,
  ChevronDown, MapPin, Zap, Search, FileText, Plus,
  GripVertical,
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
      <div className="h-[240px] rounded-xl bg-secondary animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    ),
  }
);

type CreativeMode = "ai" | "upload";

interface FileGeo {
  locations: GeoLocation[];
  radiusMiles: number;
}

interface UploadedFile {
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
  description: string;
  geoTargeting?: FileGeo;
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
          <div className="text-sm font-semibold">{title}</div>
          {badge && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">{badge}</Badge>}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

// Inline location picker for per-file geo targeting
function InlineLocationPicker({
  value,
  onChange,
}: {
  value: FileGeo | undefined;
  onChange: (geo: FileGeo | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [useCustomGeo, setUseCustomGeo] = useState(!!value);
  const locations = value?.locations ?? [];
  const radius = value?.radiusMiles ?? 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return EDINBURGH_LOCATIONS.filter(
      (l) => !locations.find((s) => s.id === l.id) &&
        (l.label.toLowerCase().includes(q) || l.group.toLowerCase().includes(q))
    );
  }, [search, locations]);

  const estimatedReach = useMemo(() => estimateReach(locations, radius), [locations, radius]);

  function addLoc(loc: GeoLocation) {
    onChange({ locations: [...locations, loc], radiusMiles: radius });
    setSearch(""); setShowDrop(false);
  }
  function removeLoc(id: string) {
    const next = locations.filter((l) => l.id !== id);
    onChange(next.length ? { locations: next, radiusMiles: radius } : undefined);
  }
  function setRadius(r: number) {
    if (locations.length) onChange({ locations, radiusMiles: r });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={useCustomGeo}
          onChange={(e) => {
            setUseCustomGeo(e.target.checked);
            if (!e.target.checked) onChange(undefined);
          }}
          className="accent-primary" />
        <span className="font-medium">Use different location for this ad</span>
        <span className="text-muted-foreground">(overrides campaign location)</span>
      </label>

      <AnimatePresence>
        {useCustomGeo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-3">

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
              <Input className="pl-8 bg-white h-8 text-xs" placeholder="Search areas…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)} />
              {showDrop && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-44 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                  {LOCATION_GROUPS.filter((g) => filtered.some((l) => l.group === g)).map((group) => (
                    <div key={group}>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">{group}</div>
                      {filtered.filter((l) => l.group === group).map((loc) => (
                        <button key={loc.id} type="button" onClick={() => addLoc(loc)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />{loc.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {showDrop && <div className="fixed inset-0 z-40" onClick={() => setShowDrop(false)} />}
            </div>

            {locations.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((loc) => (
                    <Badge key={loc.id} variant="outline" className="gap-1 pr-1 text-[10px] border-primary/20 bg-accent">
                      <MapPin className="h-2.5 w-2.5 text-primary" />{loc.label}
                      <button type="button" onClick={() => removeLoc(loc.id)} className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {RADIUS_OPTIONS.map((r) => (
                    <button key={r.value} type="button" onClick={() => setRadius(r.value)}
                      className={cn("px-2 py-1 rounded-md border text-[10px] font-medium transition-all",
                        radius === r.value ? "border-primary bg-accent text-primary" : "border-border bg-white text-muted-foreground hover:border-primary/30")}>
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <CoverageMap locations={locations} radiusMiles={radius} className="h-[200px] w-full" />
                </div>
                {estimatedReach > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Est. reach: <span className="font-semibold text-primary">~{formatCompact(estimatedReach)} people</span>
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
  const [dailyBudget, setDailyBudget] = useState("60");
  const [destinationUrl, setDestinationUrl] = useState("");

  // Campaign-level geo
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

  const estimatedReach = useMemo(() => estimateReach(selectedLocations, radiusMiles), [selectedLocations, radiusMiles]);
  const budgetPerAd = uploadedFiles.length > 1
    ? (Number(dailyBudget) / uploadedFiles.length).toFixed(2)
    : Number(dailyBudget) > 0 ? (Number(dailyBudget) / 2).toFixed(2) : "0.00";
  const adCount = Math.max(uploadedFiles.length, 2);

  async function uploadFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { toast.error("Only image or video files accepted."); return; }
    setUploading(true);
    const t = toast.loading(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("adId", `pre-${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
      const json = await res.json();
      setUploadedFiles((prev) => [...prev, {
        url: json.url, type: json.type, name: file.name, size: file.size,
        description: "", geoTargeting: undefined,
      }]);
      toast.success(`${file.name} uploaded.`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: t });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }

  function updateFile(index: number, patch: Partial<UploadedFile>) {
    setUploadedFiles((prev) => prev.map((f, i) => i === index ? { ...f, ...patch } : f));
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignName || !service || !offer) { toast.error("Fill in all campaign fields."); return; }
    if (selectedLocations.length === 0) { toast.error("Select at least one campaign location."); return; }
    const budget = Number(dailyBudget);
    if (!Number.isFinite(budget) || budget < 10) { toast.error("Daily budget must be at least £10."); return; }
    if (!destinationUrl) { toast.error("Enter a destination website URL."); return; }
    if (creativeMode === "upload" && uploadedFiles.length === 0) { toast.error("Upload at least one file."); return; }
    if (creativeMode === "upload") {
      const missingDesc = uploadedFiles.findIndex((f) => !f.description.trim());
      if (missingDesc !== -1) {
        toast.error(`Add a description for Ad ${String.fromCharCode(65 + missingDesc)} so Claude can write matching copy.`);
        return;
      }
    }

    setSubmitting(true);
    const t = toast.loading("Claude is crafting your variants…");
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
          uploadedFiles: creativeMode === "upload" ? uploadedFiles.map((f) => ({
            url: f.url, type: f.type, name: f.name, size: f.size,
            description: f.description,
            geoTargeting: f.geoTargeting ? {
              locations: f.geoTargeting.locations.map((l) => ({
                id: l.id, label: l.label, lat: l.lat, lng: l.lng,
                metaKey: l.metaKey, metaName: l.metaName,
                metaCountryCode: l.metaCountryCode, metaRegionId: l.metaRegionId,
              })),
              radiusMiles: f.geoTargeting.radiusMiles,
            } : undefined,
          })) : [],
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Failed (${res.status})`);
      const data = await res.json();
      const variantCount = uploadedFiles.length || 2;
      toast.success(`${variantCount} variants drafted · £${(budget / variantCount).toFixed(2)}/day each`, { id: t });
      router.push(`/drafts?campaign=${data.campaignId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.", { id: t });
      setSubmitting(false);
    }
  }

  const fileSizeLabel = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)}KB` : `${(b / (1024 * 1024)).toFixed(1)}MB`;

  const adLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];

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
                    £{budgetPerAd}/day × {adCount} ads
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2. Campaign-level geo ── */}
        <Card className="p-6">
          <SectionHeader icon={MapPin} title="Campaign location" subtitle="Default location applied to all ads. Each ad can override this below." />
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
              <Input className="pl-8 bg-white" placeholder="Search Edinburgh areas…"
                value={locationSearch}
                onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                onFocus={() => setShowLocationDropdown(true)} disabled={submitting} />
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                  {LOCATION_GROUPS.filter((g) => filteredLocations.some((l) => l.group === g)).map((group) => (
                    <div key={group}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">{group}</div>
                      {filteredLocations.filter((l) => l.group === group).map((loc) => (
                        <button key={loc.id} type="button"
                          onClick={() => { setSelectedLocations((p) => [...p, loc]); setLocationSearch(""); setShowLocationDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />{loc.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {showLocationDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLocationDropdown(false)} />}
            </div>

            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map((loc) => (
                  <Badge key={loc.id} variant="outline" className="gap-1.5 pr-1 py-1 border-primary/20 bg-accent">
                    <MapPin className="h-3 w-3 text-primary" />{loc.label}
                    <button type="button" onClick={() => setSelectedLocations((p) => p.filter((l) => l.id !== loc.id))}
                      className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {RADIUS_OPTIONS.map((r) => (
                <button key={r.value} type="button" onClick={() => setRadiusMiles(r.value)}
                  className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    radiusMiles === r.value ? "border-primary bg-accent text-primary gold-glow" : "border-border bg-white text-muted-foreground hover:border-primary/30")}>
                  {r.label}
                </button>
              ))}
            </div>

            {selectedLocations.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage map</Label>
                  {estimatedReach > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Est. reach: <span className="font-semibold text-primary">~{formatCompact(estimatedReach)} people</span>
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <CoverageMap locations={selectedLocations} radiusMiles={radiusMiles} className="h-[260px] w-full" />
                </div>
              </div>
            )}
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
                          <SelectContent>{[18,21,25,30,35,40,45,50].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] text-muted-foreground">Maximum</div>
                        <Select value={String(ageMax)} onValueChange={(v) => setAgeMax(Number(v))}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{[40,45,50,55,60,65].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
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
          <SectionHeader icon={ImageIcon} title="Creative" subtitle="AI-generated visuals or upload your own videos and images — any amount." />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: "ai" as CreativeMode, icon: Sparkles, title: "AI generated", desc: "Gemini renders authentic cell-phone photos" },
                { mode: "upload" as CreativeMode, icon: Upload, title: "Your own files", desc: "Upload any number of videos or images" },
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
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-4">

                  {/* Budget info */}
                  {uploadedFiles.length > 0 && Number(dailyBudget) > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-accent border border-primary/10 px-3 py-2">
                      <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-[11px] text-muted-foreground">
                        £{dailyBudget}/day ÷ {uploadedFiles.length} ads = <strong className="text-foreground">£{(Number(dailyBudget) / uploadedFiles.length).toFixed(2)}/day per ad</strong>
                      </p>
                    </div>
                  )}

                  {/* Uploaded files list */}
                  <div className="space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">

                        {/* File header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg gold-gradient shrink-0">
                              <span className="text-xs font-bold text-white">{adLabels[index]}</span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold">Ad {adLabels[index]}</div>
                              <div className="text-[11px] text-muted-foreground">{file.name} · <span className="capitalize">{file.type}</span> · {fileSizeLabel(file.size)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {file.type === "image" && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={file.url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                            )}
                            {file.type === "video" && (
                              <video src={file.url} className="h-10 w-10 rounded-lg object-cover border border-border" muted />
                            )}
                            <button type="button" onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> Describe this creative for Claude
                          </Label>
                          <Textarea rows={2} placeholder={`e.g. "Before and after kitchen reveal showing new marble worktops — timelapse, 30 seconds, ends on wide shot"`}
                            value={file.description}
                            onChange={(e) => updateFile(index, { description: e.target.value })}
                            className="bg-white text-sm resize-none" />
                          <p className="text-[11px] text-muted-foreground">Claude reads this to write copy that matches your video. Be specific.</p>
                        </div>

                        {/* Per-ad geo targeting */}
                        <div className="pt-3 border-t border-border/60 space-y-2">
                          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> Location for this ad
                          </Label>
                          <InlineLocationPicker
                            value={file.geoTargeting}
                            onChange={(geo) => updateFile(index, { geoTargeting: geo })}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Drop zone — always visible, add more files */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all",
                      dragOver ? "border-primary bg-accent/50" : "border-border hover:border-primary/40 hover:bg-secondary/20",
                      uploading && "pointer-events-none opacity-60"
                    )}>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
                      onChange={(e) => Array.from(e.target.files ?? []).forEach(uploadFile)} />
                    {uploading ? (
                      <><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Uploading…</span></>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            {uploadedFiles.length === 0 ? "Drop files here or click to browse" : "Add more files"}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Any number of videos or images · 200MB max per video · 10MB max per image
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {uploadedFiles.length > 0 && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      {uploadedFiles.length} file{uploadedFiles.length === 1 ? "" : "s"} · {uploadedFiles.length} ad variant{uploadedFiles.length === 1 ? "" : "s"} · £{(Number(dailyBudget) / uploadedFiles.length || 0).toFixed(2)}/day each
                    </p>
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
            Claude writes copy for each variant.
            {creativeMode === "ai" ? " Gemini renders the creative." : " Your uploaded files are used as creative."}
            {" "}Nothing publishes until you approve.
          </p>
          <Button type="submit" disabled={submitting || uploading} size="lg" className="shrink-0">
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Drafting…</>
              : <><Sparkles className="h-4 w-4" />Generate variants</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
