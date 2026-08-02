import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export interface CropBox {
  x: number; // 0..1 relative to image width
  y: number; // 0..1 relative to image height
  width: number; // 0..1 relative to image width
  height: number; // 0..1 relative to image height
}

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  characterName: string;
  initialCropBox?: CropBox | null;
  onSave: (cropBox: CropBox | null) => void;
  onClose: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

type DragMode = 'draw' | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export default function ImageCropModal({
  isOpen,
  imageSrc,
  characterName,
  initialCropBox = null,
  onSave,
  onClose,
  onAnalyze,
  isAnalyzing = false,
}: ImageCropModalProps) {
  const [cropBox, setCropBox] = useState<CropBox | null>(initialCropBox);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialBox?: CropBox | null }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync initialCropBox when modal opens or initialCropBox changes
  useEffect(() => {
    setCropBox(initialCropBox || null);
  }, [initialCropBox, isOpen]);

  // Convert pointer event to normalized 0..1 image coordinates
  const getNormalizedPoint = useCallback((e: MouseEvent | ReactPointerEvent | ReactMouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    return { x, y };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, mode: DragMode = 'draw') => {
    e.stopPropagation();
    const pt = getNormalizedPoint(e);
    setDragMode(mode);
    setDragStart({ x: pt.x, y: pt.y, initialBox: cropBox ? { ...cropBox } : null });

    if (mode === 'draw') {
      setCropBox({ x: pt.x, y: pt.y, width: 0, height: 0 });
    }
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragMode) return;
      const pt = getNormalizedPoint(e);
      const startX = dragStart.x;
      const startY = dragStart.y;
      const initialBox = dragStart.initialBox;

      if (dragMode === 'draw') {
        const x = Math.min(startX, pt.x);
        const y = Math.min(startY, pt.y);
        const width = Math.abs(pt.x - startX);
        const height = Math.abs(pt.y - startY);
        setCropBox({ x, y, width, height });
      } else if (dragMode === 'move' && initialBox) {
        const dx = pt.x - startX;
        const dy = pt.y - startY;

        let newX = initialBox.x + dx;
        let newY = initialBox.y + dy;

        newX = Math.max(0, Math.min(1 - initialBox.width, newX));
        newY = Math.max(0, Math.min(1 - initialBox.height, newY));

        setCropBox({
          x: newX,
          y: newY,
          width: initialBox.width,
          height: initialBox.height,
        });
      } else if (initialBox) {
        let { x, y, width, height } = initialBox;
        const right = x + width;
        const bottom = y + height;

        if (dragMode.includes('w')) {
          x = Math.min(pt.x, right - 0.02);
          width = right - x;
        }
        if (dragMode.includes('e')) {
          width = Math.max(0.02, Math.min(1 - x, pt.x - x));
        }
        if (dragMode.includes('n')) {
          y = Math.min(pt.y, bottom - 0.02);
          height = bottom - y;
        }
        if (dragMode.includes('s')) {
          height = Math.max(0.02, Math.min(1 - y, pt.y - y));
        }

        setCropBox({ x, y, width, height });
      }
    },
    [dragMode, dragStart, getNormalizedPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (dragMode) {
      setDragMode(null);
      // If box is too small, treat as empty click
      if (cropBox && (cropBox.width < 0.01 || cropBox.height < 0.01)) {
        if (dragMode === 'draw') {
          setCropBox(null);
        }
      }
    }
  }, [dragMode, cropBox]);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragMode, handlePointerMove, handlePointerUp]);

  if (!isOpen) return null;

  const hasValidCrop = Boolean(cropBox && cropBox.width > 0.01 && cropBox.height > 0.01);

  const handleClose = () => {
    onSave(hasValidCrop ? cropBox : null);
    onClose();
  };

  const handleClear = () => {
    setCropBox(null);
  };

  const handleSaveAndAnalyze = () => {
    onSave(hasValidCrop ? cropBox : null);
    if (onAnalyze) {
      onAnalyze();
    }
  };

  return (
    <div className="modal modal-open flex items-center justify-center z-50 p-4 fixed inset-0">
      <div className="modal-box max-w-5xl w-full bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left max-h-[92vh] relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-base-content/10 pb-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <span>Isolate Character:</span>
              <span className="text-primary font-extrabold">{characterName}</span>
            </h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              Click and drag a box over the image to isolate <strong>{characterName}</strong> in multi-character pictures.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content"
          >
            ✕
          </button>
        </div>

        {/* Main Canvas / Image Area */}
        <div className="flex-1 min-h-[350px] max-h-[62vh] relative flex items-center justify-center bg-slate-950/90 rounded-2xl overflow-hidden p-2 select-none">
          <div
            ref={containerRef}
            onPointerDown={(e) => handlePointerDown(e, 'draw')}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="relative max-w-full max-h-full inline-block cursor-crosshair overflow-hidden rounded-lg"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt={characterName}
              draggable={false}
              className="max-h-[58vh] w-auto max-w-full object-contain pointer-events-none rounded-lg"
            />

            {/* Bounding Box overlay */}
            {hasValidCrop && cropBox && (
              <>
                {/* Backdrop dimmed outside selection */}
                <div
                  className="absolute inset-0 bg-black/60 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 0% 100%, 
                      ${cropBox.x * 100}% 100%, 
                      ${cropBox.x * 100}% ${cropBox.y * 100}%, 
                      ${(cropBox.x + cropBox.width) * 100}% ${cropBox.y * 100}%, 
                      ${(cropBox.x + cropBox.width) * 100}% ${(cropBox.y + cropBox.height) * 100}%, 
                      ${cropBox.x * 100}% ${(cropBox.y + cropBox.height) * 100}%, 
                      ${cropBox.x * 100}% 100%, 
                      100% 100%, 100% 0%
                    )`,
                  }}
                />

                {/* Highlighted Bounding Box */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                  className="absolute border-2 border-primary bg-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.5)] cursor-move group"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.width * 100}%`,
                    height: `${cropBox.height * 100}%`,
                  }}
                >
                  {/* Badge showing character name on box */}
                  <div className="absolute -top-6 left-0 bg-primary text-primary-content text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none truncate max-w-[140px]">
                    {characterName}
                  </div>

                  {/* Corner Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  />

                  {/* Edge Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'n')}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/70 rounded-full cursor-ns-resize hover:bg-primary"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 's')}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/70 rounded-full cursor-ns-resize hover:bg-primary"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'w')}
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-primary/70 rounded-full cursor-ew-resize hover:bg-primary"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'e')}
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-primary/70 rounded-full cursor-ew-resize hover:bg-primary"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-action flex items-center justify-between border-t border-base-content/10 pt-3 mt-0 shrink-0">
          <div className="flex items-center gap-2">
            {hasValidCrop ? (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-sm btn-ghost text-error hover:bg-error/10 rounded-xl text-xs"
              >
                Clear Bounding Box
              </button>
            ) : (
              <span className="text-xs text-base-content/50 italic">
                No box selected (full image will be used). Drag on image to create a box.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-sm btn-ghost rounded-xl px-4 text-xs"
            >
              Cancel
            </button>
            {onAnalyze && (
              <button
                type="button"
                onClick={handleSaveAndAnalyze}
                disabled={isAnalyzing}
                className="btn btn-sm btn-primary bg-primary text-primary-content shadow-md shadow-primary/20 rounded-xl px-4 text-xs gap-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-primary-content" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Isolated Image...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    Analyze Isolated Image
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/75 backdrop-blur-xs fixed inset-0 cursor-pointer"
        onClick={handleClose}
      />
    </div>
  );
}
