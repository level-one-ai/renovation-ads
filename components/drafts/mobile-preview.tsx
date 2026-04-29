"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Play,
  MapPin,
} from "lucide-react";
import { humanizeEnum } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MobilePreviewProps {
  destinationUrl?: string;
  pageName?: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  useVideo?: boolean;
  variantLabel?: string;
  service?: string;
  location?: string;
  offer?: string;
  destinationUrl?: string;
}

export function MobilePreview({
  pageName = "Your Page",
  headline,
  primaryText,
  description,
  ctaButton,
  imageUrl,
  videoUrl,
  useVideo = false,
  variantLabel,
  service,
  location,
  offer,
  destinationUrl,
}: MobilePreviewProps) {
  const ctaLabel = humanizeEnum(ctaButton);
  const showVideo = useVideo && videoUrl;
  const hasMedia = showVideo || imageUrl;

  return (
    <div className="space-y-4">
      {(variantLabel || service || offer) && (
        <div className="flex items-center gap-2 flex-wrap">
          {variantLabel && (
            <Badge variant="outline" className="font-mono text-[10px]">{variantLabel}</Badge>
          )}
          {service && (
            <Badge variant="secondary" className="text-[10px]">{humanizeEnum(service)}</Badge>
          )}
          {offer && (
            <Badge variant="secondary" className="text-[10px]">{humanizeEnum(offer)}</Badge>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />{location}
            </span>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto"
        style={{ width: 360 }}
      >
        <div className="rounded-[2.25rem] border border-border/80 bg-zinc-950 p-2 shadow-2xl">
          <div className="rounded-[1.85rem] overflow-hidden bg-white text-zinc-900">
            <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-medium tabular-nums">
              <span>9:41</span>
              <div className="flex items-center gap-1"><span>•••</span><span>Wi-Fi</span></div>
            </div>

            <div className="flex items-center gap-2.5 px-3 pt-2 pb-2">
              <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                {pageName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold leading-tight truncate">{pageName}</div>
                <div className="text-[11px] text-zinc-500 leading-tight">Sponsored · 🌐</div>
              </div>
              <MoreHorizontal className="h-4 w-4 text-zinc-500" />
            </div>

            <div className="px-3 pb-2">
              <div className="text-[13px] leading-snug">
                <span className="font-medium">{primaryText.slice(0, 125)}</span>
                {primaryText.length > 125 && (
                  <span className="text-zinc-400">
                    {primaryText.slice(125, 200)}
                    {primaryText.length > 200 && (
                      <span className="text-blue-500 font-medium"> See more</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full aspect-square bg-zinc-100">
              {showVideo ? (
                <div className="relative w-full h-full">
                  <video
                    src={videoUrl!}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted loop playsInline autoPlay
                  />
                  <div className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Play className="h-2.5 w-2.5 text-white fill-white" />
                    <span className="text-[10px] text-white">Video Ad</span>
                  </div>
                </div>
              ) : imageUrl ? (
                imageUrl.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={headline} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Image src={imageUrl} alt={headline} fill sizes="360px" className="object-cover" />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center">
                    <Play className="h-5 w-5" />
                  </div>
                  <span className="text-[11px]">{useVideo ? "Upload a video below" : "Image generating…"}</span>
                </div>
              )}
              {hasMedia && (
                <div className="absolute top-2 left-2 right-2 h-8 bg-gradient-to-b from-black/30 to-transparent rounded pointer-events-none" />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-3 py-3 bg-zinc-50 border-t border-zinc-100">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1"><Globe className="h-3 w-3" />{destinationUrl ? new URL(destinationUrl.startsWith('http') ? destinationUrl : 'https://' + destinationUrl).hostname : 'yourdomain.com'}</div>
                <div className="text-[14px] font-semibold leading-tight truncate">{headline}</div>
                <div className="text-[12px] text-zinc-500 leading-tight truncate">{description}</div>
              </div>
              <button className="shrink-0 rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors px-3 py-1.5 text-[12px] font-medium whitespace-nowrap">
                {ctaLabel}
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-2.5 border-t border-zinc-100 text-zinc-600">
              <div className="flex items-center gap-1 text-[12px]"><ThumbsUp className="h-4 w-4" /><span>Like</span></div>
              <div className="flex items-center gap-1 text-[12px]"><MessageCircle className="h-4 w-4" /><span>Comment</span></div>
              <div className="flex items-center gap-1 text-[12px]"><Share2 className="h-4 w-4" /><span>Share</span></div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-sm space-y-2 text-xs">
        <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">Ad copy breakdown</div>
          <div>
            <span className="text-muted-foreground">Headline: </span>
            <span className="font-medium">{headline}</span>
            <span className={`ml-1 tabular-nums ${headline.length > 40 ? "text-rose-500" : "text-muted-foreground"}`}>({headline.length}/40)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Description: </span>
            <span className="font-medium">{description}</span>
            <span className={`ml-1 tabular-nums ${description.length > 30 ? "text-rose-500" : "text-muted-foreground"}`}>({description.length}/30)</span>
          </div>
          <div><span className="text-muted-foreground">CTA: </span><span className="font-medium">{ctaLabel}</span></div>
          <div>
            <span className="text-muted-foreground">Primary text: </span>
            <span className="tabular-nums text-muted-foreground">
              {primaryText.length} chars
              {primaryText.length > 600 && <span className="text-amber-500 ml-1">(over 600 — consider trimming)</span>}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Creative: </span>
            <span className="font-medium">{showVideo ? "Video ad" : imageUrl ? "Image ad" : "No media yet"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
