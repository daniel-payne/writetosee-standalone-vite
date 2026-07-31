import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import { readFile } from "@/data/storage/fileStorage";
import { useFetcher } from "react-router-dom";
import { writeLog } from "@/data/storage/logStorage";

type ComponentProps = {
  paragraph: any;
  name?: string;
  isExpanded?: boolean;
} & HTMLAttributes<HTMLDivElement>;

function ImageHistoryCard({
  imagePath,
  index,
  isCurrent,
  onSelect,
}: {
  imagePath: string;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const [thumbSrc, setThumbSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    readFile(imagePath)
      .then((file) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(file);
        setThumbSrc((prev) => {
          if (prev && prev.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
          return objectUrl;
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      setThumbSrc((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return '';
      });
    };
  }, [imagePath]);

  return (
    <div
      onClick={onSelect}
      className={`relative group rounded-xl border-2 overflow-hidden flex flex-col cursor-pointer transition-all duration-200 ${isCurrent
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg bg-slate-50 dark:bg-slate-900'
        }`}
    >
      <div className="aspect-square w-full relative bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        {loading ? (
          <span className="loading loading-spinner loading-sm text-primary"></span>
        ) : thumbSrc ? (
          <img
            src={thumbSrc}
            alt={`Version ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-xs text-error font-medium">Failed to load</span>
        )}

        {isCurrent && (
          <span className="absolute top-2 right-2 badge badge-primary font-bold text-[10px] shadow-sm">
            Active
          </span>
        )}
      </div>

      <div className="p-2 flex items-center justify-between bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Image {index + 1}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={isCurrent}
          className={`btn btn-xs ${isCurrent ? 'btn-success btn-disabled opacity-80' : 'btn-primary'}`}
        >
          {isCurrent ? 'Active' : 'Use This'}
        </button>
      </div>
    </div>
  );
}

export default function PanelImageDisplay({
  paragraph,
  name = 'PanelImageDisplay',
  isExpanded = false,
  ...rest
}: PropsWithChildren<ComponentProps>) {
  const [prevImagePath, setPrevImagePath] = useState(paragraph?.imageUrl || paragraph?.image);
  const [src, setSrc] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const imagePath = paragraph?.imageUrl || paragraph?.image;
  const imageStatus = paragraph?.imageStatus || 'idle';
  const isAwaitingImage = imageStatus === 'pending' || imageStatus === 'generating';
  const isCurrentlyGenerating = imageStatus === 'generating';

  if (imagePath !== prevImagePath) {
    setPrevImagePath(imagePath);
    setImgError(false);
    setLoading(imagePath ? true : false);
    if (!imagePath) {
      setSrc('');
    }
  }

  const fetcher = useFetcher();
  const isRegenerating = fetcher.state !== "idle";
  const [prevIsRegenerating, setPrevIsRegenerating] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  if (isRegenerating !== prevIsRegenerating) {
    setPrevIsRegenerating(isRegenerating);
    if (!isRegenerating && prevIsRegenerating) {
      setReloadTrigger(prev => prev + 1);
    }
  }

  const handleRegenerate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isRegenerating) return;
    fetcher.submit(
      { intent: 'REGENERATE-IMAGE', imagePath: imagePath || '', paragraphIndex: String(paragraph?.paragraphNo ?? '') },
      { method: 'post' }
    );
  };

  const handleSelectImage = (selectedPath: string) => {
    if (selectedPath === imagePath) {
      setShowModal(false);
      return;
    }
    fetcher.submit(
      {
        intent: 'SELECT-PARAGRAPH-IMAGE',
        paragraphIndex: String(paragraph?.paragraphNo ?? ''),
        imagePath: selectedPath
      },
      { method: 'post' }
    );
    setShowModal(false);
  };

  // Keep track of the active load request to ignore outdated promises
  useEffect(() => {
    if (!imagePath) {
      return;
    }

    let active = true;

    readFile(imagePath)
      .then(file => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(file);

        setSrc(prevSrc => {
          // Defer revoking the old URL until the new one is ready to render
          if (prevSrc && prevSrc.startsWith('blob:')) {
            URL.revokeObjectURL(prevSrc);
          }
          return objectUrl;
        });
        setLoading(false);
      })
      .catch(async err => {
        if (!active) return;
        const isNotFound = err && (
          (err instanceof Error && err.name === 'NotFoundError') ||
          (err.name === 'NotFoundError') ||
          String(err).includes('NotFoundError')
        );
        if (!isNotFound) {
          await writeLog('error', 'ParagraphImageDisplay', `Failed to load paragraph image: ${err instanceof Error ? err.message : String(err)}`);
        }
        setImgError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [imagePath, reloadTrigger]);

  // Clean up the final object URL only when the component unmounts
  useEffect(() => {
    return () => {
      setSrc(prevSrc => {
        if (prevSrc && prevSrc.startsWith('blob:')) {
          URL.revokeObjectURL(prevSrc);
        }
        return '';
      });
    };
  }, []);

  const hasMultipleImages = paragraph?.images && Array.isArray(paragraph.images) && paragraph.images.length > 1;

  return (
    <div {...rest} data-name={name}>
      <div
        className={`h-full w-full bg-white dark:bg-slate-800 rounded-2xl shadow-md border flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'cursor-zoom-out' : 'cursor-pointer'} ${isAwaitingImage ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200 dark:border-slate-700'}`}
        title={isExpanded ? "Double click to make small" : "Double click to enlarge"}
      >
        {/* Panel Header & Text */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-1 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary">
              Panel {(paragraph.panelNo ?? paragraph.paragraphNo ?? 0) + 1}
            </span>
            {hasMultipleImages && (
              <span className="badge badge-sm badge-ghost text-[10px] font-semibold">
                {paragraph.images.length} images
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-3 leading-relaxed">
            {paragraph.text || paragraph.sceneText || "Empty panel text"}
          </p>
        </div>

        {src && !imgError ? (
          <div className="flex-1 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 min-h-0">
            <img
              src={src}
              alt="Panel illustration"
              className={`w-full h-full ${isExpanded ? 'object-contain bg-slate-950/20' : 'object-cover group-hover:scale-105'} transition-all duration-300`}
            />
            {!isExpanded && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(true);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="btn btn-circle btn-sm bg-slate-900/60 hover:bg-slate-900/80 border-none text-white backdrop-blur-md shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 relative"
                    title={`Choose from ${paragraph.images.length} generated images`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="absolute -top-1 -right-1 badge badge-xs badge-primary font-bold text-[9px] px-1">
                      {paragraph.images.length}
                    </span>
                  </button>
                )}
                {imagePath && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    onDoubleClick={(e) => e.stopPropagation()}
                    disabled={isRegenerating}
                    className={`btn btn-circle btn-sm bg-slate-900/60 hover:bg-slate-900/80 border-none text-white backdrop-blur-md shadow-lg transition-all duration-200 ${isRegenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Regenerate Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 w-full p-4 flex flex-col justify-between items-stretch min-h-0">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-base-content/40">Status</span>
              {(loading || isAwaitingImage || isRegenerating || isCurrentlyGenerating) && (
                <div className="flex items-center gap-1.5">
                  {(isAwaitingImage || isRegenerating || isCurrentlyGenerating) && (
                    <span className="text-[9px] text-primary/70 animate-pulse font-medium">
                      {isCurrentlyGenerating ? "Generating..." : isRegenerating ? "Regenerating..." : "Awaiting illustration..."}
                    </span>
                  )}
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                </div>
              )}
            </div>

            {paragraph.error ? (
              <div className="flex flex-col gap-1.5 border-t border-error/10 pt-2 text-left mt-2 flex-1 justify-center">
                <div className="bg-error/5 p-2 rounded-lg max-h-[100px] overflow-y-auto border border-error/10">
                  <div className="text-[9px] text-error font-bold flex items-center gap-1 mb-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Generation Error
                  </div>
                  <div className="text-[9px] text-error/80 leading-normal break-words font-medium select-text">
                    {paragraph.error}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasMultipleImages && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModal(true);
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="btn btn-xs btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold normal-case flex items-center justify-center gap-1"
                      title="Choose from prior images"
                    >
                      Prior Images ({paragraph.images.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    onDoubleClick={(e) => e.stopPropagation()}
                    disabled={isRegenerating}
                    className="btn btn-xs btn-error btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold flex-1 normal-case flex items-center justify-center gap-1"
                  >
                    {isRegenerating && <span className="loading loading-spinner loading-xs"></span>}
                    {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                  </button>
                </div>
              </div>
            ) : imagePath && imgError ? (
              <div className="flex flex-col gap-1.5 border-t border-error/10 pt-1.5 text-left flex-1 justify-center">
                <div className="text-[9px] text-error font-semibold">
                  Illustration failed to load
                </div>
                <div className="flex items-center gap-1.5">
                  {hasMultipleImages && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModal(true);
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="btn btn-xs btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold normal-case flex items-center justify-center gap-1"
                      title="Choose from prior images"
                    >
                      Prior Images ({paragraph.images.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    onDoubleClick={(e) => e.stopPropagation()}
                    disabled={isRegenerating}
                    className="btn btn-xs btn-error btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold flex-1 normal-case flex items-center justify-center gap-1"
                  >
                    {isRegenerating && <span className="loading loading-spinner loading-xs"></span>}
                    {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                  </button>
                </div>
              </div>
            ) : (loading || isAwaitingImage || isRegenerating) ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-2.5 p-4 text-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="text-xs text-primary/90 font-semibold animate-pulse">
                  {isRegenerating ? "Regenerating illustration..." : "Generating illustration..."}
                </span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center gap-2 p-4 text-center">
                <span className="text-xs text-slate-400 font-medium">No illustration generated yet</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(false);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  Choose Illustration (Picture {paragraph.paragraphNo + 1})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select one of the {paragraph.images?.length || 0} generated images for this paragraph.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-sm btn-circle btn-ghost text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 min-h-[250px]">
              {paragraph.images?.map((imgPath: string, imgIdx: number) => (
                <ImageHistoryCard
                  key={imgPath || imgIdx}
                  imagePath={imgPath}
                  index={imgIdx}
                  isCurrent={imgPath === imagePath}
                  onSelect={() => handleSelectImage(imgPath)}
                />
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-sm btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}