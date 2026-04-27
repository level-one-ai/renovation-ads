"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, MapPin, DollarSign, Wrench, Tag,
  Upload, Video, Image as ImageIcon, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { SERVICE_OPTIONS, OFFER_OPTIONS } from "@/types";
import type { ServiceTypeValue, OfferTypeValue } from "@/types";

type CreativeMode = "ai" | "upload";

interface UploadedFile {
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
}

export function GenerationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [service, setService] = useState<ServiceTypeValue | "">("");
  const [location, setLocation] = useState("");
  const [dailyBudget, setDailyBudget] = useState<string>("50");
  const [offer, setOffer] = useState<OfferTypeValue | "">("");

  // Creative mode
  const [creativeMode, setCreativeMode] = useState<CreativeMode>("ai");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Only image or video files accepted.");
      return;
    }
    if (uploadedFiles.length >= 3) {
      toast.error("Maximum 3 files per campaign (one per variant).");
      return;
    }

    setUploading(true);
    const t = toast.loading(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("adId", `pre-${Date.now()}`);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const json = await res.json();
      setUploadedFiles((prev) => [
        ...prev,
        { url: json.url, type: json.type, name: file.name, size: file.size },
      ]);
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

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

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
    if (creativeMode === "upload" && uploadedFiles.length === 0) {
      toast.error("Upload at least one image or video.");
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
          // Pass uploaded files so the API can attach them to variants
          uploadedFiles: creativeMode === "upload" ? uploadedFiles : [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      toast.success("3 variants drafted!", { id: t });
      router.push(`/drafts?campaign=${data.campaignId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.", { id: t });
      setSubmitting(false);
    }
  }

  const fileSizeLabel = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Campaign name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign name</Label>
            <Input
              id="campaignName"
              placeholder="Stockbridge Kitchen Remodel — Q3 2026"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">Internal label only.</p>
          </div>

          {/* Service + Offer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Service
              </Label>
              <Select value={service} onValueChange={(v) => setService(v as ServiceTypeValue)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Pick a service" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Offer
              </Label>
              <Select value={offer} onValueChange={(v) => setOffer(v as OfferTypeValue)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Pick an offer" /></SelectTrigger>
                <SelectContent>
                  {OFFER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col items-start">
                        <span>{o.label}</span>
                        <span className="text-[11px] text-muted-foreground">{o.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location + Budget */}
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
                Neighbourhood works far better than &quot;UK-wide&quot;.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Daily budget
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
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

          {/* Creative mode toggle */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            <Label>Creative source</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreativeMode("ai")}
                className={cn(
                  "relative flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-all",
                  creativeMode === "ai"
                    ? "border-foreground bg-accent/40"
                    : "border-border/60 hover:border-foreground/30 hover:bg-accent/20"
                )}
              >
                {creativeMode === "ai" && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">AI generated</div>
                  <div className="text-[11px] text-muted-foreground">
                    Gemini renders authentic cell-phone style photos
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCreativeMode("upload")}
                className={cn(
                  "relative flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-all",
                  creativeMode === "upload"
                    ? "border-foreground bg-accent/40"
                    : "border-border/60 hover:border-foreground/30 hover:bg-accent/20"
                )}
              >
                {creativeMode === "upload" && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <Upload className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Your own files</div>
                  <div className="text-[11px] text-muted-foreground">
                    Upload images or videos from your jobs
                  </div>
                </div>
              </button>
            </div>

            {/* Upload zone — only shown when upload mode selected */}
            <AnimatePresence>
              {creativeMode === "upload" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                      dragOver
                        ? "border-foreground bg-accent/50"
                        : "border-border/60 hover:border-foreground/40 hover:bg-accent/20",
                      uploading && "pointer-events-none opacity-60"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => Array.from(e.target.files ?? []).forEach(uploadFile)}
                    />
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">Drop files here or click to browse</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Images or videos · up to 3 files (one per variant) · max 200MB video / 10MB image
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Uploaded file list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                            {f.type === "video"
                              ? <Video className="h-4 w-4 text-muted-foreground" />
                              : <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{f.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {f.type === "video" ? "Video" : "Image"} · {fileSizeLabel(f.size)}
                              {" · "}
                              <span className="text-emerald-500">Uploaded</span>
                            </div>
                          </div>
                          {/* Thumbnail preview */}
                          {f.type === "image" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.url}
                              alt={f.name}
                              className="h-10 w-10 rounded object-cover shrink-0"
                            />
                          )}
                          {f.type === "video" && (
                            <video
                              src={f.url}
                              className="h-10 w-10 rounded object-cover shrink-0"
                              muted
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground">
                        {uploadedFiles.length === 1
                          ? "This file will be used for all 3 variants."
                          : uploadedFiles.length === 2
                          ? "File 1 → Variant A & C, File 2 → Variant B."
                          : "Files assigned one-per-variant (A, B, C)."}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <p className="text-xs text-muted-foreground max-w-xs">
              {creativeMode === "ai"
                ? "Claude drafts 3 variants. Gemini generates a candid-photo creative for each."
                : "Claude drafts 3 variants using your uploaded creative."}
              {" "}Nothing publishes until you approve.
            </p>
            <Button type="submit" disabled={submitting || uploading} size="lg">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Drafting…</>
              ) : (
                <><Sparkles className="h-4 w-4" />Generate 3 variants</>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
