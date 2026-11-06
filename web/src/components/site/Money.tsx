/// Large money figures with the cents set small and raised, the way Mercury shows balances.
export function Money({ cents6, className }: { cents6: bigint; className?: string }) {
  const units = Number(cents6) / 1e6;
  const [whole, frac] = units.toFixed(2).split(".");
  const grouped = Number(whole).toLocaleString("en-US");
  return (
    <span className={className}>
      <span className="tnum">${grouped}</span>
      <span className="ml-0.5 align-[0.6em] text-[0.45em] font-semibold tnum">.{frac}</span>
    </span>
  );
}
