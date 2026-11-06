import { GLOSSARY, type Term } from "@/lib/glossary";

/// An abbreviation with its full form on hover and for screen readers.
export function Abbr({ k, children }: { k: Term; children?: React.ReactNode }) {
  const g = GLOSSARY[k];
  return (
    <abbr title={`${g.full}. ${g.say}`} className="cursor-help no-underline decoration-faint decoration-dotted underline-offset-[3px] [text-decoration-line:underline] [text-decoration-thickness:1px]">
      {children ?? k}
    </abbr>
  );
}
