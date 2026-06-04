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

  const handleRegenerate = () => {
    if (isRegenerating || !imagePath) return;
    fetcher.submit(
      { intent: 'REGENERATE-IMAGE', imagePath: imagePath },
      { method: 'post' }
    );
  };

  useEffect(() => {
    if (!imagePath) {
      return;
    }

    let objectUrl = '';
    
    readFile(imagePath)
      .then(file => {
        objectUrl = URL.createObjectURL(file);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch(async err => {
        await writeLog('error', 'ParagraphImageDisplay', `Failed to load paragraph image: ${err instanceof Error ? err.message : String(err)}`);
        setImgError(true);
        setLoading(false);
      });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imagePath]);

  return (
    <div {...rest} data-name={name}>
      <div className={`h-full w-full bg-white dark:bg-slate-800 rounded-2xl shadow-md border flex flex-col overflow-hidden relative group transition-all duration-300 ${isAwaitingImage ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200 dark:border-slate-700'}`}>
        {src && !imgError ? (
          <img
            src={src}
            alt="Paragraph illustration"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full p-4 flex flex-col justify-between items-stretch">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-base-content/40">Paragraph #{paragraph.paragraphNo}</span>
              {(loading || isAwaitingImage) && (
                <div className="flex items-center gap-1.5">
                  {isAwaitingImage && (
                    <span className="text-[9px] text-primary/70 animate-pulse font-medium">Awaiting illustration...</span>
                  )}
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto flex-1 py-2 text-left select-all">
              {paragraph.text}
            </p>

            {imagePath && imgError && (
              <div className="flex flex-col gap-1.5 border-t border-error/10 pt-1.5 text-left">
                <div className="text-[9px] text-error font-semibold">
                  Illustration failed to load
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="btn btn-xs btn-error btn-outline rounded-lg text-[9px] h-auto min-h-0 py-1 font-bold w-full normal-case"
                >
                  {isRegenerating ? "Regenerating..." : "Regenerate Image"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}