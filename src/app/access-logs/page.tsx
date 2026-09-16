import { AccessLogFilter } from "@/components/AccessLogFilter";
import { SYNTHETIC_ACCESS_LOGS } from "@/lib/accessLogs";

export default function AccessLogsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AccessLogFilter initialLogs={SYNTHETIC_ACCESS_LOGS} />
    </main>
  );
}
