import { API_ENDPOINTS } from "@/lib/apiEndpoints";

/// The read API as a flat table: method, path, purpose.
export function EndpointList() {
  return (
    <div className="overflow-x-auto border-y border-ink">
      <table className="tbl min-w-[560px]" aria-label="API endpoints">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Returns</th>
          </tr>
        </thead>
        <tbody>
          {API_ENDPOINTS.map((e) => (
            <tr key={e.path}>
              <td className="font-mono text-[12px] text-brand">{e.method}</td>
              <td className="font-mono text-[13px] text-ink">{e.path}</td>
              <td className="!whitespace-normal text-ink-2">{e.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
