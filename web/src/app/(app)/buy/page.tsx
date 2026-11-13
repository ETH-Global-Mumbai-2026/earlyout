import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { BuyScreen } from "@/components/app/BuyScreen";
import { COPY } from "@/lib/copy";

const C = COPY.app.buy;

export const metadata: Metadata = { title: C.title };

export default function Page() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <AppHeader title={C.title}>{C.description}</AppHeader>
      <BuyScreen />
    </div>
  );
}
