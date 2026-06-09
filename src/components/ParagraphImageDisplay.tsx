import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import { readFile } from "@/data/storage/fileStorage";
import { useFetcher } from "react-router-dom";
import { writeLog } from "@/data/storage/logStorage";
import { useLocalState } from '@keldan-systems/state-mutex';

type ComponentProps = {
  paragraph: any;
  name?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function ParagraphImageDisplay({
  paragraph,
  name = 'ParagraphImageDisplay',
  ...rest
}: PropsWithChildren<ComponentProps>) {
  const [prevImagePath, setPrevImagePath] = useState(paragraph?.imageUrl || paragraph?.image);
  const [src, setSrc] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStatus] = useLocalState<'idle' | 'processing'>('publication-processing-status', 'idle');

  const imagePath = paragraph?.imageUrl || paragraph?.image;
  const isAwaitingImage = processingStatus === 'processing' && !imagePath;

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

  const handleRegenerate = () => {
    if (isRegenerating) return;
    fetcher.submit(
      { intent: 'REGENERATE-IMAGE', imagePath: imagePath || '' },
      { method: 'post' }
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

  return (
    <div {...rest} data-name={name}>
      <div className={`h-full w-full bg-white dark:bg-slate-800 rounded-2xl shadow-md border flex flex-col overflow-hidden relative group transition-all duration-300 ${isAwaitingImage ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200 dark:border-slate-700'}`}>
        {src && !imgError ? (
          <>
            <img
              src={src}
              alt="Paragraph illustration"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {imagePath && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={`absolute bottom-3 right-3 z-20 btn btn-circle btn-sm bg-slate-900/60 hover:bg-slate-900/80 border-none text-white backdrop-blur-md shadow-lg transition-all duration-200 ${isRegenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title="Regenerate Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <div className="h-full w-full p-4 flex flex-col justify-between items-stretch">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-base-content/40">Picture {paragraph.paragraphNo + 1}</span>
              {(loading || isAwaitingImage || isRegenerating) && (
                <div className="flex items-center gap-1.5">
                  {(isAwaitingImage || isRegenerating) && (
                    <span className="text-[9px] text-primary/70 animate-pulse font-medium">
                      {isRegenerating ? "Regenerating..." : "Awaiting illustration..."}
                    </span>
                  )}
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto flex-1 py-2 text-left select-all">
              {paragraph.text}
            </p>

            {paragraph.error ? (
              <div className="flex flex-col gap-1.5 border-t border-error/10 pt-2 text-left mt-2">
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
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="btn btn-xs btn-error btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold w-full normal-case flex items-center justify-center gap-1"
                >
                  {isRegenerating && <span className="loading loading-spinner loading-xs"></span>}
                  {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                </button>
              </div>
            ) : imagePath && imgError ? (
              <div className="flex flex-col gap-1.5 border-t border-error/10 pt-1.5 text-left">
                <div className="text-[9px] text-error font-semibold">
                  Illustration failed to load
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="btn btn-xs btn-error btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold w-full normal-case flex items-center justify-center gap-1"
                >
                  {isRegenerating && <span className="loading loading-spinner loading-xs"></span>}
                  {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                </button>
              </div>
            ) : null}

            {!(imagePath && imgError) && !paragraph.error && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={`absolute bottom-3 right-3 z-20 btn btn-circle btn-sm bg-slate-900/60 hover:bg-slate-900/80 border-none text-white backdrop-blur-md shadow-lg transition-all duration-200 ${isRegenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title="Generate Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div >
  );
}