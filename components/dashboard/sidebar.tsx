"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Sparkles, FileEdit, BarChart3,
  Settings, Megaphone, Hammer,
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
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gold-gradient shadow-sm">
          <Hammer className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">Renovation Ads</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Contractor Edition
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent border border-primary/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4 shrink-0", active && "text-primary")} />
              <span className="relative">{item.label}</span>
              {active && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full gold-gradient" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spend widget */}
      <div className="px-4 py-5 border-t border-border">
        <div className="rounded-xl border border-primary/20 bg-accent p-4">
          <div className="text-[10px] font-semibold tracking-[0.16em] uppercase text-primary/70 mb-1">
            Spend this month
          </div>
          <div className="font-display text-2xl text-foreground tabular-nums">£0.00</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Connect Meta to sync spend.
          </div>
        </div>
      </div>
    </aside>
  );
}
