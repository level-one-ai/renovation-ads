"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2 } from "lucide-react";
import { humanizeEnum } from "@/lib/utils";

export interface MobilePreviewProps {
  pageName?: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  imageUrl: string | null;
}

export function MobilePreview({
  pageName = "Your Page",
  headline,
  primaryText,
  description,
  ctaButton,
  imageUrl,
}: MobilePreviewProps) {
  const ctaLabel = humanizeEnum(ctaButton);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto"
      style={{ width: 360 }}
    >
      {/* Phone bezel */}
      <div className="rounded-[2.25rem] border border-border/80 bg-zinc-950 p-2 shadow-2xl">
        <div className="rounded-[1.85rem] overflow-hidden bg-white text-zinc-900">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-medium tabular-nums">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>•••</span>
              <span>Wi-Fi</span>
            </div>
          </div>

          {/* Page header */}
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-2">
            <div className="h-9 w-9 rounded-full bg-zinc-200" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">
                {pageName}
              </div>
              <div className="text-[11px] text-zinc-500 leading-tight">
                Sponsored · 🌐
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-zinc-500" />
          </div>

          {/* Primary text */}
          <div className="px-3 pb-2 text-[13px] leading-snug whitespace-pre-wrap">
            {primaryText}
          </div>

          {/* Image */}
          <div className="relative w-full aspect-square bg-zinc-100">
            {imageUrl ? (
              imageUrl.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={headline}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={headline}
                  fill
                  sizes="360px"
                  className="object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-400">
                Image generating…
              </div>
            )}
          </div>

          {/* Headline / CTA strip */}
          <div className="flex items-center justify-between gap-3 px-3 py-3 bg-zinc-50 border-t border-zinc-100">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                yourdomain.com
              </div>
              <div className="text-[14px] font-semibold leading-tight truncate">
                {headline}
              </div>
              <div className="text-[12px] text-zinc-500 leading-tight truncate">
                {description}
              </div>
            </div>
            <button className="shrink-0 rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors px-3 py-1.5 text-[12px] font-medium">
              {ctaLabel}
            </button>
          </div>

          {/* Engagement bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-zinc-100 text-zinc-600">
            <div className="flex items-center gap-1 text-[12px]">
              <ThumbsUp className="h-4 w-4" />
              <span>Like</span>
            </div>
            <div className="flex items-center gap-1 text-[12px]">
              <MessageCircle className="h-4 w-4" />
              <span>Comment</span>
            </div>
            <div className="flex items-center gap-1 text-[12px]">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
