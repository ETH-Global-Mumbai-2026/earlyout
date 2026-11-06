import { configured, missingAddresses } from "@/lib/addresses";
import { Notice } from "./ui";

export function ConfigNotice() {
  if (configured) return null;
  return (
    <div className="mb-4">
      <Notice tone="error">
        The app is not configured. Missing contract addresses: {missingAddresses.join(", ")}. Run <code className="t-mono">pnpm sync-addresses</code>{" "}
        after deploying, or set NEXT_PUBLIC_MODE=mock for demo data.
      </Notice>
    </div>
  );
}
