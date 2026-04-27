"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FileEdit,
  BarChart3,
  Settings,
  Megaphone,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/drafts", label: "Drafts", icon: FileEdit },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-border/60">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
          <Hammer className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Renovation Ads</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            v0.1 · contractor edition
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative h-4 w-4 shrink-0" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border/60">
        <div className="rounded-lg border border-border/60 bg-card/60 p-3">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Spend this month
          </div>
          <div className="mt-1 font-display text-2xl tabular-nums">$0.00</div>
          <div className="text-[11px] text-muted-foreground/80 mt-0.5">
            Connect Meta to sync.
          </div>
        </div>
      </div>
    </aside>
  );
}
