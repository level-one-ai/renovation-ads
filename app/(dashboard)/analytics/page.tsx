import { Header } from "@/components/dashboard/header";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <>
      <Header
        title="Analytics"
        subtitle="Live performance from Meta + AI audit reports."
      />
      <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 max-w-6xl">
        <AnalyticsClient />
      </main>
    </>
  );
}
