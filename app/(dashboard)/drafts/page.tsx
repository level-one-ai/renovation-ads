import { Suspense } from "react";
import { Header } from "@/components/dashboard/header";
import { DraftsClient } from "@/components/drafts/drafts-client";

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  return (
    <>
      <Header
        title="Drafts"
        subtitle="Review variants on a real mobile preview. Approve or kill before publishing."
      />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8">
        <Suspense fallback={null}>
          <DraftsClient />
        </Suspense>
      </main>
    </>
  );
}
