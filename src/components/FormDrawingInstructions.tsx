import React, { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from 'react';
import { readFile } from '@/data/storage/fileStorage';

interface FormDrawingInstructionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  isAnalyzing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  referenceUrl?: string;
  isReferenceActive?: boolean;
  onOpenPicker?: () => void;
  name?: string;
}

export default function FormDrawingInstructions({
  name = 'FormDrawingInstructions',
  value,
  isAnalyzing,
  onChange,
  referenceUrl = '',
  isReferenceActive = false,
  onOpenPicker,
  ...rest
}: PropsWithChildren<FormDrawingInstructionsProps>) {
  const [localImageUrl, setLocalImageUrl] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Load local image object URL when referenceUrl changes
  useEffect(() => {
    if (!referenceUrl) {
      setLocalImageUrl('');
      setImgError(false);
      return;
    }

    if (referenceUrl.startsWith('http') || referenceUrl.startsWith('data:') || referenceUrl.startsWith('blob:')) {
      setLocalImageUrl(referenceUrl);
      setImgError(false);
      return;
    }

    let active = true;
    let objectUrl = '';

    readFile(referenceUrl)
      .then(file => {
        if (!active) return;
        objectUrl = URL.createObjectURL(file);
        setLocalImageUrl(objectUrl);
        setImgError(false);
      })
      .catch(() => {
        if (!active) return;
        setImgError(true);
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [referenceUrl]);

  // Synchronize text when value changes from outside (preset click, analysis complete, etc.)
  useEffect(() => {
    if (textRef.current && textRef.current.innerText !== value) {
      textRef.current.innerText = value;
    }
  }, [value]);

  const handleInput = () => {
    if (!textRef.current) return;
    const newText = textRef.current.innerText;
    onChange({
      target: {
        name: 'drawingInstructions',
        value: newText
      }
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  const showReferenceImage = Boolean(isReferenceActive && referenceUrl && localImageUrl && !imgError);

  return (
    <div {...rest} data-name={name} className={`flex-1 flex flex-col h-full min-h-0 ${rest.className || ''}`}>
      <div className="shrink-0 mb-2">
        <label htmlFor="drawingInstructions" className="ps-1 block text-md font-semibold text-base-content mb-0.5">
          Drawing Instructions
        </label>
        <label htmlFor="drawingInstructions" className="ps-1 block text-xs font-normal text-base-content/60">
          These instructions describe how you want the images in your story to be drawn.
        </label>
      </div>

      {/* Hidden textarea for native form submission */}
      <textarea
        name="drawingInstructions"
        id="drawingInstructions"
        value={value}
        onChange={() => {}}
        className="hidden"
        readOnly
      />

      {/* Outer Editor Frame */}
      <div
        className="relative w-full flex-1 h-full min-h-0 border border-base-content/20 dark:border-slate-700 rounded-xl bg-base-100 dark:bg-slate-900/60 p-3.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all overflow-y-auto"
        onClick={() => {
          if (textRef.current && document.activeElement !== textRef.current) {
            textRef.current.focus();
          }
        }}
      >
        {/* Floated elements for Bottom-Right image positioning & text wrapping */}
        {showReferenceImage && (
          <>
            {/* Spacer that pushes the floated image to the bottom-right corner without exceeding container height */}
            <div
              aria-hidden="true"
              style={{
                float: 'right',
                height: 'calc(100% - 138px)',
                width: '1px',
                pointerEvents: 'none',
                margin: 0,
                padding: 0,
              }}
            />
            {/* Floated Reference Image card */}
            <div
              style={{
                float: 'right',
                clear: 'right',
                width: '128px',
                height: '128px',
              }}
              className="relative ml-3 mb-1 p-1 bg-base-200/90 dark:bg-slate-800/90 rounded-2xl border border-base-content/15 shadow-lg group cursor-pointer hover:border-primary transition-all select-none z-10"
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onOpenPicker && !isAnalyzing) {
                  onOpenPicker();
                }
              }}
              title={isAnalyzing ? 'Analyzing reference style...' : 'Double-click to change reference image'}
            >
              <div className="w-full h-full relative rounded-xl overflow-hidden bg-base-300 dark:bg-slate-950 flex items-center justify-center">
                <img
                  src={localImageUrl}
                  alt="Style Reference"
                  className={`w-full h-full object-cover transition-all ${isAnalyzing ? 'opacity-40 blur-xs scale-95' : 'group-hover:scale-105'}`}
                />
                {isAnalyzing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs p-2 text-center">
                    <svg className="animate-spin h-6 w-6 text-primary mb-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-[10px] font-bold text-white leading-tight">Analyzing...</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-center p-2 opacity-0 group-hover:opacity-100">
                    <span className="text-[9px] font-semibold text-white bg-black/70 px-2 py-0.5 rounded-full shadow text-center leading-tight">
                      Double-click to change
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Editable text container */}
        <div
          ref={textRef}
          contentEditable={!isAnalyzing}
          onInput={handleInput}
          suppressContentEditableWarning
          className="outline-none whitespace-pre-wrap font-sans text-sm text-base-content leading-relaxed"
          style={{ wordBreak: 'break-word' }}
        />

        {/* Empty state placeholder when value is empty and not focused */}
        {!value && (
          <div
            className="absolute top-3.5 left-3.5 text-sm text-base-content/40 pointer-events-none font-sans"
            aria-hidden="true"
          >
            {isAnalyzing
              ? 'Analyzing style reference image to generate drawing instructions...'
              : 'Enter drawing instructions or select a preset from above...'}
          </div>
        )}
      </div>
    </div>
  );
}
