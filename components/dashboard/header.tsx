"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between h-14 px-6 lg:px-8 border-b border-border/60 bg-background/40 backdrop-blur-xl sticky top-0 z-30">
      <div className="leading-tight">
        <h1 className="text-sm font-medium tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="h-8">
          <Link href="/generate">
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        </Button>
      </div>
    </header>
  );
}
