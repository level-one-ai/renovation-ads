"use client";

import { useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

interface EditableAd {
  id: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  beforeAfterUrl?: string | null;
  useBeforeAfter: boolean;
}

const CTA_OPTIONS = [
  "LEARN_MORE",
  "GET_QUOTE",
  "CONTACT_US",
  "BOOK_NOW",
  "GET_OFFER",
] as const;

export function EditDrawer({
  ad,
  open,
  onOpenChange,
  onSaved,
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
  const [saving, setSaving] = useState(false);

  async function save() {
    if (headline.length > 40) {
      toast.error("Headline must be 40 characters or fewer.");
      return;
    }
    if (description.length > 30) {
      toast.error("Description must be 30 characters or fewer.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          primaryText,
          description,
          ctaButton,
          beforeAfterUrl: beforeAfterUrl || null,
          useBeforeAfter,
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
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
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
            Tweak the copy or swap in a real Before/After photo. Nothing publishes until you
            approve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Headline</span>
              <span
                className={`text-[11px] tabular-nums ${
                  headline.length > 40 ? "text-rose-500" : "text-muted-foreground"
                }`}
              >
                {headline.length} / 40
              </span>
            </Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Primary text</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {primaryText.length} chars
              </span>
            </Label>
            <Textarea
              rows={6}
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              First 125 chars show on mobile before the &quot;See more&quot; cutoff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>Description</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    description.length > 30 ? "text-rose-500" : "text-muted-foreground"
                  }`}
                >
                  {description.length} / 30
                </span>
              </Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CTA button</Label>
              <Select value={ctaButton} onValueChange={setCtaButton}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Before/After photo URL (optional)
            </Label>
            <Input
              placeholder="https://..."
              value={beforeAfterUrl}
              onChange={(e) => setBeforeAfterUrl(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useBeforeAfter}
                onChange={(e) => setUseBeforeAfter(e.target.checked)}
                className="accent-foreground"
              />
              Use this photo instead of the AI-generated image
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
