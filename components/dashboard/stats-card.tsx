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
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
      </div>
      <div className="mt-3 font-display text-3xl tabular-nums leading-none">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-2 text-xs tabular-nums",
            delta.positive ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {delta.positive ? "↑" : "↓"} {delta.value}
        </div>
      )}
    </Card>
  );
}
