import { useState, type HTMLAttributes, type PropsWithChildren } from "react";
import { useLoaderData } from "react-router-dom";
import { useLocalState } from "@keldan-systems/state-mutex";

type ImagesProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Images({
  ...rest
}: PropsWithChildren<ImagesProps>) {
  const loaderData = useLoaderData() as any;
  const images = loaderData?.images || [];
  const [isDEBUG] = useLocalState<boolean>('isDEBUG', false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [selectedPromptImage, setSelectedPromptImage] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleToggleExpand = (idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div {...rest} className={`p-6 w-full h-full overflow-auto flex flex-col ${rest.className || ''}`}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Image Storage</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Displaying {images.length} generated images in creation order. Double click any image to maximize.
          </p>
        </div>
        {expandedIdx !== null && (
          <button
            type="button"
            onClick={() => setExpandedIdx(null)}
            className="btn btn-sm btn-outline btn-primary rounded-xl"
          >
            Show Grid View
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400">No images found in storage.</p>
        </div>
      ) : (
        <div className={`w-full flex-1 min-h-0 ${expandedIdx !== null ? 'flex flex-col' : 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3 content-start'}`}>
          {images.map((image: any, idx: number) => {
            const isExpanded = expandedIdx === idx;
            if (expandedIdx !== null && !isExpanded) {
              return null;
            }

            return (
              <div
                key={image.name}
                onDoubleClick={() => handleToggleExpand(idx)}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${
                  isExpanded ? 'w-full h-full cursor-zoom-out' : 'w-full max-w-[500px] aspect-square mx-auto cursor-pointer hover:shadow-lg group'
                }`}
                title={isExpanded ? "Double click to make small" : "Double click to enlarge"}
              >
                <div className={`w-full relative flex items-center justify-center ${isExpanded ? 'w-full h-full bg-slate-950/20' : 'flex-1 min-h-0 bg-slate-100 dark:bg-slate-900 overflow-hidden'}`}>
                  <img
                    src={image.url}
                    alt={image.name}
                    className={`w-full h-full transition-transform duration-300 ${
                      isExpanded ? 'object-contain' : 'object-cover group-hover:scale-105'
                    }`}
                  />
                  {!isExpanded && image.paragraphNo && (
                    <span className="absolute top-3 left-3 badge badge-sm bg-slate-900/70 text-white border-none backdrop-blur-md shadow-md">
                      Picture {image.paragraphNo}
                    </span>
                  )}
                  {isDEBUG && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPromptImage(image);
                      }}
                      className="absolute top-3 right-3 z-10 btn btn-xs bg-slate-900/80 hover:bg-slate-900 text-purple-300 hover:text-white border border-purple-500/40 backdrop-blur-md shadow-lg rounded-lg gap-1 font-mono text-[10px] tracking-wide transition-all"
                      title="View prompt associated with this image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Prompt
                    </button>
                  )}
                </div>

                {!isExpanded && (
                  <div className="p-3.5 h-28 shrink-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-col justify-between text-left">
                    {image.text ? (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium line-clamp-2">
                        {image.text}
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">
                        No text prompt associated
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100/50 dark:border-slate-700/50">
                      <span className="truncate max-w-[160px]" title={image.name}>
                        {image.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {isDEBUG && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPromptImage(image);
                            }}
                            className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded border border-purple-500/20 transition-colors"
                          >
                            Prompt
                          </button>
                        )}
                        {image.lastModified && (
                          <span>
                            {new Date(image.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedPromptImage && (
        <div className="modal modal-open flex items-center justify-center z-50 p-4 fixed inset-0">
          <div className="modal-box max-w-3xl w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left max-h-[85vh] relative z-10">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-mono text-[10px]">
                    DEBUG PROMPT
                  </span>
                  {selectedPromptImage.paragraphNo && (
                    <span className="badge badge-sm badge-ghost text-xs">
                      Picture {selectedPromptImage.paragraphNo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-md font-mono" title={selectedPromptImage.name}>
                  {selectedPromptImage.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPromptImage(null)}
                className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap select-text border border-slate-800">
              {selectedPromptImage.promptText || (
                <span className="text-slate-500 italic">
                  No prompt text found associated with this image (digest: {selectedPromptImage.digest || 'unknown'}).
                </span>
              )}
            </div>

            <div className="modal-action flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                disabled={!selectedPromptImage.promptText}
                onClick={() => {
                  if (selectedPromptImage.promptText) {
                    navigator.clipboard.writeText(selectedPromptImage.promptText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="btn btn-sm btn-outline btn-secondary rounded-xl gap-1.5"
              >
                {copied ? "✓ Copied!" : "Copy Prompt"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPromptImage(null)}
                className="btn btn-sm btn-primary rounded-xl px-5"
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/60 backdrop-blur-xs fixed inset-0 cursor-pointer"
            onClick={() => setSelectedPromptImage(null)}
          ></div>
        </div>
      )}
    </div>
  );
}
