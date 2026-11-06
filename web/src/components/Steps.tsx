import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/// Numbered steps that tick off as the user completes them.
export function Steps({ steps, done }: { steps: string[]; done: number }) {
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Steps">
      {steps.map((s, i) => {
        const complete = i < done;
        const current = i === done;
        return (
          <li key={s} className="min-w-0" aria-current={current ? "step" : undefined}>
            <div className={cn("h-1 rounded-full transition-colors duration-300", complete ? "bg-accent" : current ? "bg-accent/40" : "bg-sunk")} />
            <div className={cn("mt-1.5 flex items-center gap-1 truncate text-[11px] font-medium", complete || current ? "text-ink-2" : "text-faint")}>
              {complete ? <Check size={11} strokeWidth={3} className="shrink-0 text-accent" /> : <span className="shrink-0 tnum">{i + 1}</span>}
              <span className="truncate">{s}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
