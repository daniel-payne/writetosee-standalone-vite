import { useState } from "react";
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData } from "react-router-dom";
import type { LogRecord } from "./Logs.loader";

type LogsProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Logs({
  children,
  ...rest
}: PropsWithChildren<LogsProps>) {
  const loaderData = useLoaderData() as { logs: LogRecord[]; error?: string; warning?: string };
  const logs = loaderData?.logs || [];
  const error = loaderData?.error;
  const warning = loaderData?.warning;

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warn" | "error">("all");

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === "all" || log.type.toLowerCase() === levelFilter;

    return matchesSearch && matchesLevel;
  });

  const getLevelBadgeClass = (level: string) => {
    const norm = level.toLowerCase();
    switch (norm) {
      case "error":
        return "badge badge-error text-error-content shadow-sm";
      case "warn":
      case "warning":
        return "badge badge-warning text-warning-content shadow-sm";
      case "info":
      default:
        return "badge badge-info text-info-content shadow-sm";
    }
  };

  return (
    <div {...rest} className={`p-6 w-full h-full overflow-auto ${rest.className || ''}`} data-name="Logs">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            System & Activity Logs
          </h1>
          <p className="text-sm text-base-content/60 mt-1">
            Browse and inspect background operation outputs, file writes, and API interactions.
          </p>
        </div>

        {error && (
          <div className="alert alert-error rounded-2xl shadow-sm text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {warning && (
          <div className="alert alert-warning rounded-2xl shadow-sm text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>{warning}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="card bg-base-100 shadow-md border border-base-content/10 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 w-full gap-2">
            <input
              type="text"
              placeholder="Search message or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-sm input-bordered w-full max-w-md rounded-xl"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setLevelFilter("all")}
              className={`btn btn-xs rounded-lg ${levelFilter === "all" ? "btn-primary" : "btn-ghost"}`}
            >
              All
            </button>
            <button
              onClick={() => setLevelFilter("info")}
              className={`btn btn-xs rounded-lg ${levelFilter === "info" ? "btn-info" : "btn-ghost"}`}
            >
              Info
            </button>
            <button
              onClick={() => setLevelFilter("warn")}
              className={`btn btn-xs rounded-lg ${levelFilter === "warn" ? "btn-warning" : "btn-ghost"}`}
            >
              Warning
            </button>
            <button
              onClick={() => setLevelFilter("error")}
              className={`btn btn-xs rounded-lg ${levelFilter === "error" ? "btn-error" : "btn-ghost"}`}
            >
              Error
            </button>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="card bg-base-100 shadow-md border border-base-content/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-base-content/10 flex justify-between items-center bg-base-100/50">
            <h2 className="font-bold text-lg">Activity History</h2>
            <span className="badge badge-sm badge-outline text-base-content/50">{filteredLogs.length} matching</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-base-content/50">
              No logs found matching the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-base-content/10">
              {[...filteredLogs].reverse().map((log, index) => (
                <div key={index} className="p-4 hover:bg-base-200/20 transition-colors flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className={getLevelBadgeClass(log.type)}>{log.type}</span>
                    <span className="font-mono text-xs text-base-content/50">
                      {new Date(log.datetime).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-outline badge-xs text-base-content/60 font-mono font-semibold">
                        {log.source}
                      </span>
                      <p className="font-medium text-sm text-base-content/95">{log.message}</p>
                    </div>
                  </div>

                  <div className="text-right hidden md:block">
                    <span className="text-xs text-base-content/40 font-mono">
                      {new Date(log.datetime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
