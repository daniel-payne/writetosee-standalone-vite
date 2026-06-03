import { useState, useMemo, useEffect } from "react";
import { readFile } from "@/data/storage/fileStorage";

// -------------------------------------------------------------
// HELPER COMPONENTS
// -------------------------------------------------------------

// Local Image Loader & Previewer
function LocalImagePreview({ filename }: { filename: string }) {
  const [src, setSrc] = useState<string>("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl = "";
    setLoading(true);
    setError(false);
    readFile(filename)
      .then((file) => {
        objectUrl = URL.createObjectURL(file);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load local image:", err);
        setError(true);
        setLoading(false);
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filename]);

  if (error) {
    return <span className="text-xs text-error/85 italic ml-2">(Image load failed: {filename})</span>;
  }

  if (loading) {
    return <span className="loading loading-spinner loading-xs ml-2"></span>;
  }

  return (
    <div className="relative group/img inline-block ml-2 my-1 align-middle">
      <img
        src={src}
        alt={filename}
        className="h-12 w-12 object-cover rounded-lg border border-base-content/20 shadow-sm cursor-zoom-in hover:scale-110 transition-transform duration-200"
      />
      {/* Premium hover zoom overlay */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/img:block z-50 p-2 bg-base-100 rounded-xl shadow-2xl border border-base-content/15 max-w-sm max-h-[400px] overflow-hidden pointer-events-none transition-all">
        <img src={src} alt={filename} className="max-w-[280px] max-h-[280px] object-contain rounded-lg" />
        <div className="text-[10px] mt-1.5 font-mono text-center break-all text-base-content/75">{filename}</div>
      </div>
    </div>
  );
}

// Web Image Previewer
function WebImagePreview({ url }: { url: string }) {
  return (
    <div className="relative group/img inline-block ml-2 my-1 align-middle">
      <img
        src={url}
        alt="External"
        className="h-12 w-12 object-cover rounded-lg border border-base-content/20 shadow-sm cursor-zoom-in hover:scale-110 transition-transform duration-200"
      />
      {/* Premium hover zoom overlay */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/img:block z-50 p-2 bg-base-100 rounded-xl shadow-2xl border border-base-content/15 max-w-sm max-h-[400px] overflow-hidden pointer-events-none transition-all">
        <img src={url} alt="External preview" className="max-w-[280px] max-h-[280px] object-contain rounded-lg" />
        <div className="text-[10px] mt-1.5 font-mono text-center break-all text-base-content/75">{url}</div>
      </div>
    </div>
  );
}

// Keyword Highlight Component
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/80 text-black dark:text-white px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Collapsible Large String component
function CollapsibleString({
  value,
  path,
  expandedStrings,
  toggleStringExpand,
  searchQuery,
}: {
  value: string;
  path: string;
  expandedStrings: Set<string>;
  toggleStringExpand: (path: string) => void;
  searchQuery: string;
}) {
  const isLong = value.length > 120 || value.includes("\n");
  const isExpanded = expandedStrings.has(path) || (searchQuery && value.toLowerCase().includes(searchQuery.toLowerCase()));

  const isLocalImg = useMemo(() => {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(value) && !value.startsWith("http") && !value.startsWith("data:") && !value.startsWith("blob:");
  }, [value]);

  const isWebImg = useMemo(() => {
    return value.startsWith("http") && /\.(png|jpe?g|gif|webp|svg)/i.test(value);
  }, [value]);

  if (!isLong) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-success font-medium select-all">
          "<HighlightText text={value} query={searchQuery} />"
        </span>
        {isLocalImg && <LocalImagePreview filename={value} />}
        {isWebImg && <WebImagePreview url={value} />}
      </span>
    );
  }

  const displayedText = isExpanded ? value : value.slice(0, 100) + "...";

  return (
    <span className="inline-flex flex-col text-left max-w-full">
      <span className="text-success font-medium whitespace-pre-wrap select-all leading-relaxed">
        "<HighlightText text={displayedText} query={searchQuery} />"
      </span>
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => toggleStringExpand(path)}
          className="btn btn-[8px] btn-outline btn-ghost w-fit px-2 py-0.5 rounded h-auto min-h-0 normal-case border-base-content/20 text-base-content/70 hover:bg-base-content/10"
        >
          {isExpanded ? "Show Less" : `Show More (${value.length} chars)`}
        </button>
        {isLocalImg && <LocalImagePreview filename={value} />}
        {isWebImg && <WebImagePreview url={value} />}
      </div>
    </span>
  );
}

// Copy button helper
function CopyButton({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="tooltip tooltip-right" data-tip={copied ? "Copied!" : tooltip}>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded hover:bg-base-content/10 text-base-content/40 hover:text-base-content transition-colors"
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-success">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m9.9-3.75l3 3m0 0l-3 3m3-3H8.25m9.9 0v11.25" />
          </svg>
        )}
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN JSON EXPLORER COMPONENT
// -------------------------------------------------------------

interface JSONExplorerProps {
  data: any;
}

export default function JSONExplorer({ data }: JSONExplorerProps) {
  const [selectedProperty, setSelectedProperty] = useState("");
  const [valueSearchQuery, setValueSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["$"]));
  const [expandedStrings, setExpandedStrings] = useState<Set<string>>(new Set());

  // Collect all unique properties (keys) recursively
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    function collect(val: any) {
      if (val && typeof val === "object") {
        if (!Array.isArray(val)) {
          Object.keys(val).forEach((k) => {
            keys.add(k);
            collect(val[k]);
          });
        } else {
          val.forEach((item) => collect(item));
        }
      }
    }
    collect(data);
    return Array.from(keys).sort();
  }, [data]);

  // Deep scan helper to expand matching query items
  const { matches, pathsToExpand } = useMemo(() => {
    const matches = new Set<string>();
    const pathsToExpand = new Set<string>();

    if (!selectedProperty && !valueSearchQuery) {
      return { matches, pathsToExpand };
    }

    const queryLower = valueSearchQuery.toLowerCase();

    function valueMatches(val: any): boolean {
      if (!valueSearchQuery) return true;
      if (val === null) return "null".includes(queryLower);
      return String(val).toLowerCase().includes(queryLower);
    }

    function scan(val: any, path: string, parentKey: string | number | null): boolean {
      let isMatch = false;

      // Check primitive values
      if (val === null || typeof val !== "object") {
        const keyMatches = !selectedProperty || String(parentKey) === selectedProperty;
        const valMatches = valueMatches(val);

        if (keyMatches && valMatches) {
          isMatch = true;
          matches.add(path);
        }
      }

      if (val && typeof val === "object") {
        let hasChildMatch = false;
        if (Array.isArray(val)) {
          val.forEach((item, idx) => {
            const childPath = `${path}[${idx}]`;
            if (scan(item, childPath, idx)) {
              hasChildMatch = true;
            }
          });
        } else {
          Object.entries(val).forEach(([k, v]) => {
            const childPath = path === "$" ? `$.${k}` : `${path}.${k}`;

            // If selectedProperty matches k, and valueSearchQuery is empty,
            // then this whole object key matches. We can mark it.
            if (selectedProperty === k && !valueSearchQuery) {
              isMatch = true;
              matches.add(childPath);
            }

            if (scan(v, childPath, k)) {
              hasChildMatch = true;
            }
          });
        }

        if (hasChildMatch || isMatch) {
          pathsToExpand.add(path);
          return true;
        }
      }

      return isMatch;
    }

    scan(data, "$", null);
    return { matches, pathsToExpand };
  }, [data, selectedProperty, valueSearchQuery]);

  // Compute dynamic stats card
  const stats = useMemo(() => {
    let charCount = 0;
    let objectCount = 0;
    let arrayCount = 0;
    const arrays: Array<{ name: string; size: number }> = [];

    function traverse(val: any, name = "root") {
      if (val === null) return;
      if (typeof val === "object") {
        if (Array.isArray(val)) {
          arrayCount++;
          if (name !== "root") {
            arrays.push({ name, size: val.length });
          }
          val.forEach((item) => traverse(item, name));
        } else {
          objectCount++;
          Object.entries(val).forEach(([k, v]) => traverse(v, k));
        }
      } else if (typeof val === "string") {
        charCount += val.length;
      }
    }

    traverse(data);
    return { charCount, objectCount, arrayCount, arrays };
  }, [data]);

  // Collapse/Expand nodes helper
  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleStringExpand = (path: string) => {
    setExpandedStrings((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const paths: string[] = [];
    function collect(val: any, path = "$") {
      if (val && typeof val === "object") {
        paths.push(path);
        if (Array.isArray(val)) {
          val.forEach((item, idx) => collect(item, `${path}[${idx}]`));
        } else {
          Object.entries(val).forEach(([k, v]) => {
            collect(v, path === "$" ? `$.${k}` : `${path}.${k}`);
          });
        }
      }
    }
    collect(data);
    setExpandedNodes(new Set(paths));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(["$"]));
  };

  const isNodeExpanded = (path: string) => {
    if (selectedProperty || valueSearchQuery) {
      return pathsToExpand.has(path) || expandedNodes.has(path);
    }
    return expandedNodes.has(path);
  };

  // Node renderer
  const renderNode = (value: any, path: string, keyName: string | number | null, depth: number) => {
    const isObj = value !== null && typeof value === "object";
    const isArr = Array.isArray(value);
    const hasChildren = isObj && (isArr ? value.length > 0 : Object.keys(value).length > 0);
    const expanded = isNodeExpanded(path);
    const isKeyMatching = selectedProperty && String(keyName) === selectedProperty;

    // Styling helpers
    const indentBorderColor = "border-base-content/10 hover:border-primary/45";

    if (isObj) {
      const summaryText = isArr ? `[${value.length} items]` : `{${Object.keys(value).length} keys}`;

      return (
        <div key={path} className="flex flex-col text-left">
          {/* Key line */}
          <div
            onClick={() => hasChildren && toggleNode(path)}
            className={`flex items-center gap-1.5 py-1 px-1.5 rounded-lg group select-none transition-colors cursor-pointer hover:bg-base-content/5`}
          >
            {/* Toggle Arrow */}
            {hasChildren ? (
              <span className="text-base-content/50 group-hover:text-primary transition-transform duration-200">
                {expanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </span>
            ) : (
              <span className="w-3.5"></span>
            )}

            {/* Key name */}
            <span className={`font-mono text-sm font-semibold tracking-wide ${isKeyMatching ? "bg-yellow-200 dark:bg-yellow-800/80 rounded px-0.5 text-black dark:text-white" : "text-primary/90"}`}>
              {keyName !== null ? `${keyName}:` : ""}
            </span>

            {/* Value Preview */}
            <span className="text-xs font-semibold font-mono text-base-content/40 tracking-wider">
              {summaryText}
            </span>

            {/* Tool bar showing on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
              <CopyButton text={JSON.stringify(value, null, 2)} tooltip="Copy object" />
              <CopyButton text={path} tooltip="Copy JSON path" />
            </div>
          </div>

          {/* Children container with border-guide */}
          {hasChildren && expanded && (
            <div className={`pl-6 border-l-2 ml-3.5 my-0.5 flex flex-col gap-0.5 transition-colors duration-250 ${indentBorderColor}`}>
              {isArr
                ? value.map((item: any, idx: number) => renderNode(item, `${path}[${idx}]`, idx, depth + 1))
                : Object.entries(value).map(([k, v]) => renderNode(v, path === "$" ? `$.${k}` : `${path}.${k}`, k, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf Render
    return (
      <div key={path} className="flex items-start gap-1.5 py-0.5 px-1.5 ml-3.5 group hover:bg-base-content/5 rounded-lg transition-colors">
        {/* Dot placeholder */}
        <span className="w-3.5 h-3.5 flex items-center justify-center text-base-content/20 text-xs">
          •
        </span>

        {/* Key name */}
        <span className={`font-mono text-sm font-semibold tracking-wide ${isKeyMatching ? "bg-yellow-200 dark:bg-yellow-800/80 rounded px-0.5 text-black dark:text-white" : "text-base-content/70"}`}>
          {keyName !== null ? `${keyName}:` : ""}
        </span>

        {/* Primitive value styles */}
        <span className="font-mono text-sm break-all leading-relaxed text-left flex-1 min-w-0">
          {value === null && <span className="italic text-base-content/30 select-all">null</span>}
          {typeof value === "boolean" && (
            <span className={`px-1.5 py-0.2 rounded font-bold text-xs select-all ${value ? "bg-success/20 text-success border border-success/30" : "bg-error/20 text-error border border-error/30"}`}>
              {value ? "true" : "false"}
            </span>
          )}
          {typeof value === "number" && (
            <span className="text-secondary font-bold select-all">
              <HighlightText text={String(value)} query={valueSearchQuery} />
            </span>
          )}
          {typeof value === "string" && (
            <CollapsibleString
              value={value}
              path={path}
              expandedStrings={expandedStrings}
              toggleStringExpand={toggleStringExpand}
              searchQuery={valueSearchQuery}
            />
          )}
        </span>

        {/* Toolbar */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto shrink-0 self-center">
          <CopyButton text={String(value)} tooltip="Copy value" />
          <CopyButton text={path} tooltip="Copy JSON path" />
        </div>
      </div>
    );
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "publication.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        {/* Stats card */}
        <div className="card bg-base-100 shadow-lg border border-base-content/5 overflow-hidden">
          <div className="card-body p-5">
            <h3 className="card-title text-sm uppercase tracking-wider text-base-content/50 font-bold mb-2">
              Publication Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-content/5 flex flex-col">
                <span className="text-2xl font-black text-primary">{stats.objectCount + stats.arrayCount}</span>
                <span className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider mt-0.5">Containers</span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-content/5 flex flex-col">
                <span className="text-2xl font-black text-secondary">
                  {Math.round(stats.charCount / 1000)}k
                </span>
                <span className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider mt-0.5">Text Chars</span>
              </div>
            </div>

            {/* List arrays details */}
            {stats.arrays.length > 0 && (
              <div className="mt-4 border-t border-base-content/10 pt-3 flex flex-col gap-2">
                <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider text-left">
                  Detected Lists
                </span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {stats.arrays.map((arr, i) => (
                    <div key={i} className="flex justify-between items-center bg-base-200/30 px-2.5 py-1.5 rounded-lg border border-base-content/5">
                      <span className="font-mono text-xs text-base-content/85">{arr.name}</span>
                      <span className="badge badge-sm badge-secondary font-bold">{arr.size} items</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card bg-base-100 shadow-lg border border-base-content/5">
          <div className="card-body p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="card-title text-sm uppercase tracking-wider text-base-content/50 font-bold text-left">
                Search Data
              </h3>

              {/* Property Select Dropdown */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider pl-1">
                  Property (Key)
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="select select-bordered select-sm w-full rounded-xl text-xs bg-base-200 focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Any Property</option>
                  {allKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Input Search Box */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider pl-1">
                  Value Content
                </label>
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Type value search..."
                    value={valueSearchQuery}
                    onChange={(e) => setValueSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs border border-base-content/20 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-base-200 h-9"
                  />
                  <span className="absolute left-3 top-2.5 text-base-content/40">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
                    </svg>
                  </span>
                  {valueSearchQuery && (
                    <button
                      onClick={() => setValueSearchQuery("")}
                      className="absolute right-3 top-2 text-base-content/40 hover:text-base-content"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(selectedProperty || valueSearchQuery) && (
              <div className="text-xs bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 p-2.5 rounded-lg border border-yellow-200 dark:border-yellow-900/60 text-left">
                Found <strong>{matches.size}</strong> matches. Collapsed structures auto-expanded.
              </div>
            )}

            {/* Tree operations */}
            <div className="flex flex-col gap-2 pt-2 border-t border-base-content/10">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider text-left">
                Tree Operations
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="btn btn-sm btn-outline flex-1 rounded-lg border-base-content/20 text-xs font-bold hover:bg-base-content/10 h-9"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="btn btn-sm btn-outline flex-1 rounded-lg border-base-content/20 text-xs font-bold hover:bg-base-content/10 h-9"
                >
                  Collapse All
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="btn btn-sm btn-secondary w-full rounded-lg text-xs font-bold gap-1.5 mt-1 h-9"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main tree explorer */}
      <div className="flex-1 card bg-base-100 shadow-lg border border-base-content/5 overflow-hidden">
        <div className="card-body p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-base-content/10 mb-4">
            <h3 className="card-title text-base font-bold text-base-content/85">
              Interactive JSON Tree
            </h3>
            <span className="text-xs font-mono font-bold bg-base-200 px-2 py-1 rounded border border-base-content/5 text-base-content/60">
              $ (Root)
            </span>
          </div>

          <div className="overflow-x-auto flex-1 font-mono select-none text-left min-h-[300px]">
            {Object.keys(data).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-base-content/40 italic">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2 text-base-content/20 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
                Publication is currently empty.
              </div>
            ) : (
              renderNode(data, "$", null, 0)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
