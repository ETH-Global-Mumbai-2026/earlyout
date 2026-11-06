import type { ReactNode } from "react";

/// Content is simply there. iOS moves things in answer to a touch, not to a
/// scroll, so sections no longer animate in; the wrapper keeps the layout API.
export function Reveal({ children, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function Stagger({ children, className }: { children: ReactNode[]; className?: string }) {
  return <div className={className}>{children}</div>;
}
