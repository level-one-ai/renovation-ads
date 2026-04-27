"use client";

import { useState, useRef } from "react";
import { Loader2, Save, Upload, Video, Image as ImageIcon, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface EditableAd {
  id: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  beforeAfterUrl?: string | null;
  useBeforeAfter: boolean;
  videoUrl?: string | null;
  useVideo?: boolean;
}

const CTA_OPTIONS = ["LEARN_MORE", "GET_QUOTE", "CONTACT_US", "BOOK_NOW", "GET_OFFER"] as const;

export function EditDrawer({
  ad, open, onOpenChange, onSaved,
}: {
  ad: EditableAd;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [headline, setHeadline] = useState(ad.headline);
  const [primaryText, setPrimaryText] = useState(ad.primaryText);
  const [description, setDescription] = useState(ad.description);
  const [ctaButton, setCtaButton] = useState(ad.ctaButton);
  const [beforeAfterUrl, setBeforeAfterUrl] = useState(ad.beforeAfterUrl ?? "");
  const [useBeforeAfter, setUseBeforeAfter] = useState(ad.useBeforeAfter);
  const [videoUrl, setVideoUrl] = useState(ad.videoUrl ?? "");
  const [useVideo, setUseVideo] = useState(ad.useVideo ?? false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Only image or video files are accepted.");
      return;
    }

    setUploading(true);
    const t = toast.loading(`Uploading ${isVideo ? "video" : "image"}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("adId", ad.id);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const json = await res.json();

      if (isVideo) {
        setVideoUrl(json.url);
        setUseVideo(true);
        setUseBeforeAfter(false);
      } else {
        setBeforeAfterUrl(json.url);
        setUseBeforeAfter(true);
        setUseVideo(false);
      }
      toast.success(`${isVideo ? "Video" : "Image"} uploaded.`, { id: t });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg, { id: t });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  async function save() {
    if (headline.length > 40) { toast.error("Headline must be 40 characters or fewer."); return; }
    if (description.length > 30) { toast.error("Description must be 30 characters or fewer."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline, primaryText, description, ctaButton,
          beforeAfterUrl: beforeAfterUrl || null, useBeforeAfter,
          videoUrl: videoUrl || null, useVideo,
          creativeType: useVideo ? "VIDEO" : "IMAGE",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Saved.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit ad</DialogTitle>
          <DialogDescription>
            Tweak copy, upload your own video or image, or swap the AI creative. Nothing publishes until you approve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Copy fields */}
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Headline</span>
              <span className={`text-[11px] tabular-nums ${headline.length > 40 ? "text-rose-500" : "text-muted-foreground"}`}>
                {headline.length} / 40
              </span>
            </Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Primary text</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{primaryText.length} chars</span>
            </Label>
            <Textarea rows={5} value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">First 125 chars show before the "See more" cutoff on mobile.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>Description</span>
                <span className={`text-[11px] tabular-nums ${description.length > 30 ? "text-rose-500" : "text-muted-foreground"}`}>
                  {description.length} / 30
                </span>
              </Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CTA button</Label>
              <Select value={ctaButton} onValueChange={setCtaButton}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CTA_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Media upload */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <Label className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload creative
            </Label>

            {/* Drag and drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                dragOver ? "border-foreground bg-accent/50" : "border-border/60 hover:border-foreground/40 hover:bg-accent/20"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Uploading…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Drop video or image here</span>
                  <span className="text-xs text-muted-foreground">or click to browse · MP4, MOV, JPG, PNG · max 200MB video / 10MB image</span>
                </div>
              )}
            </div>

            {/* Uploaded video preview */}
            {videoUrl && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Video className="h-3.5 w-3.5" /> Video uploaded
                  </div>
                  <button onClick={() => { setVideoUrl(""); setUseVideo(false); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <video src={videoUrl} className="w-full rounded-md aspect-video object-cover" muted controls />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={useVideo} onChange={(e) => { setUseVideo(e.target.checked); if (e.target.checked) setUseBeforeAfter(false); }} className="accent-foreground" />
                  Use this video as the ad creative
                </label>
              </div>
            )}

            {/* Uploaded image preview */}
            {beforeAfterUrl && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <ImageIcon className="h-3.5 w-3.5" /> Image uploaded
                  </div>
                  <button onClick={() => { setBeforeAfterUrl(""); setUseBeforeAfter(false); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={beforeAfterUrl} alt="Before/After" className="w-full rounded-md aspect-video object-cover" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={useBeforeAfter} onChange={(e) => { setUseBeforeAfter(e.target.checked); if (e.target.checked) setUseVideo(false); }} className="accent-foreground" />
                  Use this image instead of the AI-generated one
                </label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving…</>) : (<><Save className="h-4 w-4" />Save changes</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
