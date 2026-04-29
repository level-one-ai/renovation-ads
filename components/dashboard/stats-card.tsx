import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon?: LucideIcon;
  className?: string;
}

export function StatsCard({ label, value, delta, icon: Icon, className }: StatsCardProps) {
  return (
    <Card className={cn("p-5 bg-white hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">{label}</div>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-accent">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-3xl tabular-nums text-foreground leading-none">{value}</div>
      {delta && (
        <div className={cn("mt-2 text-xs tabular-nums font-medium", delta.positive ? "text-emerald-600" : "text-rose-500")}>
          {delta.positive ? "↑" : "↓"} {delta.value}
        </div>
      )}
    </Card>
  );
}
