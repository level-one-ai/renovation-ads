import { Header } from "@/components/dashboard/header";
import { GenerationForm } from "@/components/generate/generation-form";
import { Sparkles, Camera, Lock } from "lucide-react";

export default function GeneratePage() {
  return (
    <>
      <Header
        title="Generate a campaign"
        subtitle="Claude drafts the copy, Gemini renders the creative."
      />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8 max-w-5xl">
          <GenerationForm />

          <aside className="space-y-4 lg:pt-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              How this works
            </div>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-sm font-medium">Claude drafts 3 variants</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Each tests a different angle: cost transparency, trust, scarcity, etc.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                  <Camera className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-sm font-medium">Gemini renders the image</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authentic cell-phone-style photography. No 3D renders, no fake stock.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                  <Lock className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-sm font-medium">You approve before publish</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drafts land in the queue. Tweak, swap photos, or kill them — nothing
                    goes live until you click Publish.
                  </p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </main>
    </>
  );
}
