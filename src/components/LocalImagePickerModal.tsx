import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import { readFile, listFiles } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

type LocalImage = { name: string; url: string };

type LocalImagePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (filename: string) => void;
  name?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'>;

export default function LocalImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  name = 'LocalImagePickerModal',
  ...rest
}: PropsWithChildren<LocalImagePickerModalProps>) {
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      localImages.forEach(img => URL.revokeObjectURL(img.url));
      setLocalImages([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadImages = async () => {
      try {
        const files = await listFiles();
        const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));

        const images = await Promise.all(
          imageNames.map(async imgName => {
            const file = await readFile(imgName);
            return { name: imgName, url: URL.createObjectURL(file) };
          })
        );

        if (isMounted) {
          setLocalImages(images);
        } else {
          images.forEach(img => URL.revokeObjectURL(img.url));
        }
      } catch (err) {
        await writeLog(
          'error',
          'LocalImagePickerModal',
          `Failed to load local images: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div {...rest} data-name={name} className="modal modal-open">
      <div className="modal-box max-w-3xl border border-base-content/10 shadow-2xl bg-base-100 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div>
            <h3 className="font-bold text-lg text-base-content">Pick Style Reference Image</h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              Select an image from your connected folder to use as a style reference.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm font-medium text-base-content/70">Scanning folder for images...</span>
            </div>
          ) : localImages.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-base-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-base-content/40">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base-content/70 font-medium">No images found</p>
              <p className="text-xs text-base-content/50 mt-1">Make sure you have PNG, JPG, WEBP, or SVG images in your connected project folder.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[55vh] overflow-y-auto p-1">
              {localImages.map(image => (
                <button
                  key={image.name}
                  type="button"
                  onClick={() => {
                    onSelect(image.name);
                    onClose();
                  }}
                  title={image.name}
                  className="group cursor-pointer bg-base-200/50 dark:bg-slate-800/60 border border-base-content/10 rounded-xl p-1.5 hover:border-primary hover:bg-base-200 hover:shadow-lg transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary aspect-square flex items-center justify-center"
                >
                  <div className="w-full h-full bg-base-300 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action border-t border-base-content/10 pt-3 mt-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-xs" onClick={onClose}></div>
    </div>
  );
}
