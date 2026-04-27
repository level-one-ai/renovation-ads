import { Check, AlertCircle } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

interface EnvCheck {
  key: string;
  label: string;
  group: "Anthropic" | "Gemini" | "Meta" | "Storage" | "App";
  required: boolean;
  // Don't expose values — only whether they're set.
}

const checks: EnvCheck[] = [
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API key", group: "Anthropic", required: true },
  { key: "ANTHROPIC_MODEL", label: "Anthropic model", group: "Anthropic", required: false },
  { key: "GEMINI_API_KEY", label: "Gemini API key", group: "Gemini", required: true },
  { key: "GEMINI_IMAGE_MODEL", label: "Gemini image model", group: "Gemini", required: false },
  { key: "META_APP_ID", label: "Meta app ID", group: "Meta", required: true },
  { key: "META_APP_SECRET", label: "Meta app secret", group: "Meta", required: true },
  { key: "META_ACCESS_TOKEN", label: "Meta access token", group: "Meta", required: true },
  { key: "META_AD_ACCOUNT_ID", label: "Meta ad account ID", group: "Meta", required: true },
  { key: "META_PAGE_ID", label: "Meta page ID", group: "Meta", required: true },
  { key: "META_PIXEL_ID", label: "Meta pixel ID", group: "Meta", required: false },
  { key: "META_API_VERSION", label: "Meta API version", group: "Meta", required: false },
  { key: "BLOB_READ_WRITE_TOKEN", label: "Vercel Blob token", group: "Storage", required: false },
  { key: "DATABASE_URL", label: "PostgreSQL URL", group: "App", required: true },
  { key: "NEXT_PUBLIC_APP_URL", label: "App URL", group: "App", required: false },
];

export default function SettingsPage() {
  // Server-side: read env presence only.
  const status = checks.map((c) => ({
    ...c,
    set: !!process.env[c.key],
  }));

  const groups = Array.from(
    status.reduce((map, item) => {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
      return map;
    }, new Map<EnvCheck["group"], (EnvCheck & { set: boolean })[]>())
  );

  const missingRequired = status.filter((s) => s.required && !s.set).length;

  return (
    <>
      <Header
        title="Settings"
        subtitle="Environment configuration. All keys are read from .env."
      />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 max-w-3xl space-y-6">
        {missingRequired > 0 && (
          <Card className="p-4 border-amber-500/40 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {missingRequired} required key{missingRequired === 1 ? "" : "s"} missing
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add the missing values to your <code className="font-mono">.env.local</code>{" "}
                  file and restart the dev server. The app will not be fully functional until
                  all required keys are set.
                </p>
              </div>
            </div>
          </Card>
        )}

        {groups.map(([group, items]) => (
          <Card key={group} className="p-6">
            <h3 className="text-sm font-semibold tracking-tight">{group}</h3>
            <Separator className="my-4" />
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <code className="text-[11px] text-muted-foreground font-mono">
                      {item.key}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.required && (
                      <Badge variant="outline" className="text-[10px]">
                        optional
                      </Badge>
                    )}
                    {item.set ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <Check className="h-3 w-3" />
                        Set
                      </Badge>
                    ) : (
                      <Badge
                        variant={item.required ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        Not set
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground pt-2">
          Values themselves are never displayed — only whether they are configured. Edit your{" "}
          <code className="font-mono">.env.local</code> and restart to change them.
        </p>
      </main>
    </>
  );
}
