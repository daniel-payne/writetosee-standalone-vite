import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData } from "react-router-dom";
import type { CostRecord } from "./Costs.loader";

type CostsProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Costs({
  children,
  ...rest
}: PropsWithChildren<CostsProps>) {
  const loaderData = useLoaderData() as { costs: CostRecord[] };
  const costs = loaderData?.costs || [];

  // Calculations
  const totalCost = costs.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalQueries = costs.length;
  const avgCost = totalQueries > 0 ? totalCost / totalQueries : 0;

  return (
    <div {...rest} className={`p-6 w-full h-full overflow-auto ${rest.className || ''}`} data-name="Costs">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            LLM API Usage Costs
          </h1>
          <p className="text-sm text-base-content/60 mt-1">
            Track and monitor the accumulated costs for all API-based text and image generation.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-base-100 shadow-md border border-base-content/10 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total Accumulated Cost</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-primary">${totalCost.toFixed(5)}</span>
              <span className="text-sm text-base-content/50">USD</span>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md border border-base-content/10 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Total API Queries</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-secondary">{totalQueries}</span>
              <span className="text-sm text-base-content/50">requests</span>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md border border-base-content/10 p-6 rounded-2xl flex flex-col justify-between">
            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Average Cost / Query</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-info">${avgCost.toFixed(5)}</span>
              <span className="text-sm text-base-content/50">USD</span>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="card bg-base-100 shadow-md border border-base-content/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-base-content/10 flex justify-between items-center bg-base-100/50">
            <h2 className="font-bold text-lg">Query History Log</h2>
            <span className="badge badge-sm badge-outline text-base-content/50">{totalQueries} entries</span>
          </div>

          {costs.length === 0 ? (
            <div className="p-12 text-center text-base-content/50">
              No cost records found. Costs will appear as you generate content using LLMs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="bg-base-200/50">
                    <th className="rounded-none">Timestamp</th>
                    <th>Query Cost (USD)</th>
                    <th className="rounded-none text-right">Running Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let acc = 0;
                    return [...costs].reverse().map((record, index) => {
                      // Note: since we reversed it to show latest first, we should pre-calculate or calculate properly.
                      // Let's compute running totals from the original array first.
                      return null; // logic placeholder
                    });
                  })()}
                  {(() => {
                    // Pre-calculate running total for each item in the original index order
                    let runningSum = 0;
                    const itemsWithTotal = costs.map((r) => {
                      runningSum += r.cost;
                      return { ...r, runningTotal: runningSum };
                    });

                    return itemsWithTotal.reverse().map((record, idx) => (
                      <tr key={idx} className="hover:bg-base-200/30 transition-colors">
                        <td className="font-mono text-xs">{new Date(record.date).toLocaleString()}</td>
                        <td className="font-mono text-sm font-semibold text-secondary">
                          ${record.cost.toFixed(5)}
                        </td>
                        <td className="font-mono text-sm text-right text-base-content/75">
                          ${record.runningTotal.toFixed(5)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
