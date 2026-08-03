import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import { readFile } from "@/data/storage/fileStorage";
import { useFetcher } from "react-router-dom";
import { writeLog } from "@/data/storage/logStorage";
import PanelInstructionsModal from "./PanelInstructionsModal";
import { useInstructions } from "@/data/process/manageInstructions";
import { useLocalState } from "@keldan-systems/state-mutex";

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
      <div className="w-full aspect-[4/3] relative bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden rounded-t-xl">
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
          <span className="absolute top-2.5 right-2.5 badge badge-sm bg-slate-900/90 text-emerald-400 border border-emerald-500/40 font-bold text-[10px] shadow-md flex items-center gap-1 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            Active
          </span>
        )}
      </div>

      <div className="p-2.5 flex items-center justify-between bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
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
          className={`btn btn-xs ${isCurrent ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 btn-disabled opacity-90 font-bold' : 'btn-primary'}`}
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
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const [isDEBUG] = useLocalState<boolean>('isDEBUG', false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [modalPromptText, setModalPromptText] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [imageProcessingStatus] = useLocalState<'idle' | 'processing'>('publication-image-processing-status', 'idle');
  const [pubProcessingStatus] = useLocalState<'idle' | 'processing'>('publication-processing-status', 'idle');

  const [savedInstructions] = useInstructions();

  const panelIdx = paragraph?.panelNo ?? paragraph?.paragraphNo ?? 0;
  const savedInst = savedInstructions[panelIdx];

  const handleOpenPromptModal = async () => {
    setShowPromptModal(true);
    setPromptLoading(true);
    setCopiedPrompt(false);

    const digest = paragraph?.digest;
    if (digest) {
      try {
        const file = await readFile(`prompts/${digest}.txt`);
        const text = await file.text();
        if (text && text.trim()) {
          setModalPromptText(text);
          setPromptLoading(false);
          return;
        }
      } catch {
        // Fallback below
      }
    }

    const fallback = paragraph?.text || paragraph?.promptText || paragraph?.sceneText || "No prompt text generated yet.";
    setModalPromptText(fallback);
    setPromptLoading(false);
  };

  const handleCopyPrompt = () => {
    if (modalPromptText) {
      navigator.clipboard.writeText(modalPromptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const activeInst = savedInst || {
    panelNo: panelIdx,
    characters: paragraph?.characters || [],
    cinematographicText: paragraph?.cinematographicText || "",
    isLocked: paragraph?.isLocked || false
  };

  const isLocked = activeInst.isLocked;
  const assignedCharacters = activeInst.characters || [];
  const cinematographicText = activeInst.cinematographicText || "";

  const isPanelFailed = Boolean(paragraph?.error || paragraph?.imageStatus === 'failed');

  const imagePath = paragraph?.imageUrl || paragraph?.image;
  const imageStatus = paragraph?.imageStatus || 'idle';
  const needsRegenerate = !isPanelFailed && Boolean(paragraph?.needsRegenerate);

  const isAwaitingImage = !isPanelFailed && (imageStatus === 'pending' || imageStatus === 'generating' || needsRegenerate);
  const isCurrentlyGenerating = !isPanelFailed && (imageStatus === 'generating' || imageStatus === 'pending' || needsRegenerate);
  const isGlobalProcessing = imageProcessingStatus === 'processing' || pubProcessingStatus === 'processing';

  const isThisPanelGenerating = !isPanelFailed && (isCurrentlyGenerating || isAwaitingImage || (isGlobalProcessing && (needsRegenerate || imageStatus === 'pending' || imageStatus === 'generating')));

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
      { intent: 'REGENERATE-IMAGE', imagePath: imagePath || '', paragraphIndex: String(panelIdx) },
      { method: 'post', action: '/story' }
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
        paragraphIndex: String(panelIdx),
        imagePath: selectedPath
      },
      { method: 'post', action: '/story' }
    );
    setShowModal(false);
  };

  const handleSaveInstructions = (data: { characters: string[]; cinematographicText: string; isLocked: boolean }) => {
    fetcher.submit(
      {
        intent: 'SAVE-PANEL-INSTRUCTIONS',
        panelNo: String(panelIdx),
        characters: JSON.stringify(data.characters),
        cinematographicText: data.cinematographicText,
        isLocked: String(data.isLocked)
      },
      { method: 'post', action: '/story' }
    );
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

  const hasPriorImages = paragraph?.images && Array.isArray(paragraph.images) && paragraph.images.length > 0;

  return (
    <div {...rest} data-name={name}>
      <div
        className={`h-full w-full bg-white dark:bg-slate-800 rounded-2xl shadow-md border flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'cursor-zoom-out' : 'cursor-pointer'} ${isAwaitingImage ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200 dark:border-slate-700'}`}
        title={paragraph.text || paragraph.sceneText || (isExpanded ? "Double click to make small" : "Double click to enlarge")}
      >
        {/* Top Badges / Indicators (Left) */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 flex-wrap max-w-[calc(100%-3.5rem)] pointer-events-none">
          {isLocked && (
            <span className="badge badge-xs bg-amber-500/90 text-slate-950 font-bold border border-amber-400 shadow-sm flex items-center gap-1 py-1 px-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked
            </span>
          )}
          {assignedCharacters.length > 0 && (
            <span className="badge badge-xs bg-slate-900/80 text-sky-300 border border-sky-500/40 font-semibold shadow-sm flex items-center gap-1 py-1 px-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {assignedCharacters.length}
            </span>
          )}
          {cinematographicText && (
            <span className="badge badge-xs bg-slate-900/80 text-purple-300 border border-purple-500/40 font-semibold shadow-sm flex items-center gap-1 py-1 px-1.5" title={cinematographicText}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Directions
            </span>
          )}
        </div>

        {/* Top Right Edit Button (Revealed on hover) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowInstructionsModal(true);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-30 btn btn-circle btn-sm bg-slate-900/60 hover:bg-slate-900/80 border-none text-white backdrop-blur-md shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="Edit Panel Instructions & Characters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>

        {src && !imgError && !paragraph.error && paragraph.imageStatus !== 'failed' ? (
          <div className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
            <img
              src={src}
              alt="Panel illustration"
              className={`w-full h-full ${isExpanded ? 'object-contain bg-slate-950/20' : 'object-cover group-hover:scale-105'} transition-all duration-300`}
            />

            {/* Regenerating / Generating Overlay Feedback */}
            {(isRegenerating || isThisPanelGenerating) && !isPanelFailed && (
              <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-md flex flex-col justify-center items-center gap-3 p-4 text-center animate-fadeIn">
                <div className="relative flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-white font-bold tracking-wide animate-pulse">
                    {isRegenerating ? "Regenerating illustration..." : "Generating illustration..."}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">
                    Drawing new panel image with updated instructions...
                  </span>
                </div>
              </div>
            )}

            {!isExpanded && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                {hasPriorImages && (
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

            {/* Debug Mode: View Generated Prompt Button (Bottom Left, Revealed on hover) */}
            {isDEBUG && !isExpanded && (
              <div className="absolute bottom-3 left-3 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPromptModal();
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="btn btn-circle btn-sm bg-slate-900/70 hover:bg-slate-900/90 border-none text-emerald-400 backdrop-blur-md shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="View Generated Prompt (Debug Mode)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : (paragraph.error || paragraph.imageStatus === 'failed') ? (
          /* Error state: full-bleed panel with centered error message + same hover buttons as image panel */
          <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-6">
            {/* Centered error message */}
            <div className="bg-error/10 dark:bg-error/20 p-3 rounded-xl max-h-[140px] overflow-y-auto border border-error/20 max-w-[280px] w-full">
              <div className="text-[11px] text-error font-bold flex items-center gap-1.5 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Generation Error
              </div>
              <div className="text-[10px] text-error/90 leading-relaxed break-words font-medium select-text">
                {paragraph.error || "Image generation failed."}
              </div>
            </div>

            {/* Hover buttons — same as image panel: bottom-right */}
            {!isExpanded && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                {hasPriorImages && (
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
              </div>
            )}

            {/* Debug Mode: View Generated Prompt Button (Bottom Left, Revealed on hover) */}
            {isDEBUG && !isExpanded && (
              <div className="absolute bottom-3 left-3 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPromptModal();
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="btn btn-circle btn-sm bg-slate-900/70 hover:bg-slate-900/90 border-none text-emerald-400 backdrop-blur-md shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="View Generated Prompt (Debug Mode)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 w-full p-4 flex flex-col justify-between items-stretch min-h-0 pt-7">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-base-content/40">Status</span>
              {loading || isThisPanelGenerating || isRegenerating ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-primary/70 animate-pulse font-medium">
                    {isRegenerating ? "Regenerating..." : "Generating..."}
                  </span>
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                </div>
              ) : (
                <span className="badge badge-xs badge-ghost font-medium text-[10px]">
                  {paragraph.imageStatus === 'pending' ? 'Pending' : 'Idle'}
                </span>
              )}
            </div>

            {isCurrentlyGenerating || isRegenerating ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-2.5 p-4 text-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="text-xs text-primary/90 font-semibold animate-pulse">
                  {isRegenerating ? "Regenerating illustration..." : "Generating illustration..."}
                </span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center gap-3 p-4 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  {paragraph.imageStatus === 'pending' ? "Awaiting illustration generation..." : "No illustration generated yet"}
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    onDoubleClick={(e) => e.stopPropagation()}
                    disabled={isRegenerating}
                    className="btn btn-sm btn-outline rounded-xl text-xs font-bold px-4 py-2 normal-case flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                  >
                    {isRegenerating && <span className="loading loading-spinner loading-xs"></span>}
                    {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                  </button>
                </div>
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
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  Choose Illustration (Picture {(paragraph?.panelNo ?? paragraph?.paragraphNo ?? 0) + 1})
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

            <div className="p-5 overflow-y-auto max-h-[75vh] flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-800/80">
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

      {showInstructionsModal && (
        <PanelInstructionsModal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          panelNo={panelIdx}
          currentCharacters={assignedCharacters}
          currentCinematographicText={cinematographicText}
          currentIsLocked={isLocked}
          onSave={handleSaveInstructions}
        />
      )}

      {/* Debug Mode: View Prompt Modal */}
      {showPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            setShowPromptModal(false);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    Panel {panelIdx + 1} Prompt
                    {paragraph?.digest && (
                      <span className="badge badge-sm font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {paragraph.digest}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exact prompt text used for LLM image generation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="btn btn-sm btn-circle btn-ghost text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {promptLoading ? (
                <div className="flex justify-center items-center p-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : (
                <pre className="font-mono text-xs p-4 bg-slate-950 text-emerald-400 rounded-xl max-h-[50vh] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text border border-slate-800">
                  {modalPromptText || "No prompt text found for this panel."}
                </pre>
              )}
            </div>

            {/* Modal Footer Action Area */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={handleCopyPrompt}
                disabled={!modalPromptText || promptLoading}
                className="btn btn-sm btn-primary text-white text-xs font-bold shadow-sm flex items-center gap-1.5 px-3.5"
              >
                {copiedPrompt ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied Prompt!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Prompt
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="btn btn-sm btn-ghost text-xs normal-case"
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