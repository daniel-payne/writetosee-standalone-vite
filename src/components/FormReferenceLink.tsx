import React, { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";

import { readFile, listFiles } from "@/data/storage/fileStorage";
import { writeLog } from "@/data/storage/logStorage";

type ComponentProps = {
    referenceValue: string;
    instructionsValue: string;
    isAnalyzing: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    name?: string;
} & HTMLAttributes<HTMLDivElement>;

type LocalImage = { name: string; url: string };

export default function FormReferenceLink({
    referenceValue,
    instructionsValue,
    isAnalyzing,
    onChange,
    name = 'FormReferenceLink',
    ...rest
}: PropsWithChildren<ComponentProps>) {
    const [prevReferenceValue, setPrevReferenceValue] = useState(referenceValue);
    const [imgError, setImgError] = useState(false);
    const [localImageUrl, setLocalImageUrl] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [localImages, setLocalImages] = useState<LocalImage[]>([]);

    if (referenceValue !== prevReferenceValue) {
        setPrevReferenceValue(referenceValue);
        setImgError(false);
        setLocalImageUrl('');
    }

    const isLocalFile = referenceValue && !referenceValue.startsWith('http') && !referenceValue.startsWith('blob:') && !referenceValue.startsWith('data:');
    const displaySrc = isLocalFile ? localImageUrl : referenceValue;

    useEffect(() => {
        if (!isModalOpen) {
            localImages.forEach(img => URL.revokeObjectURL(img.url));
        }
    }, [isModalOpen, localImages]);

    useEffect(() => {
        if (!isLocalFile) {
            return;
        }

        let objectUrl = '';
        readFile(referenceValue).then(file => {
            objectUrl = URL.createObjectURL(file);
            setLocalImageUrl(objectUrl);
        }).catch(async err => {
            await writeLog('error', 'FormReferenceLink', `Failed to load local file: ${err instanceof Error ? err.message : String(err)}`);
            setImgError(true);
        });

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [referenceValue, isLocalFile]);

    const handleOpenModal = async () => {
        try {
            const files = await listFiles();
            const imageNames = files.filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f));

            const images = await Promise.all(imageNames.map(async name => {
                const file = await readFile(name);
                return { name, url: URL.createObjectURL(file) };
            }));

            setLocalImages(images);
            setIsModalOpen(true);
        } catch (e) {
            await writeLog('error', 'FormReferenceLink', `Failed to list files: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const handleFileSelect = (filename: string) => {
        onChange({
            target: {
                name: 'referenceUrl',
                value: filename
            }
        } as React.ChangeEvent<HTMLInputElement>);

        onChange({
            target: {
                name: 'linkInstructions',
                value: ''
            }
        } as React.ChangeEvent<HTMLTextAreaElement>);

        setIsModalOpen(false);
    };

    return (
        <div {...rest} data-name={name} className={`flex-1 flex flex-col min-h-0 ${rest.className || ''}`}>
            <input type="hidden" name="linkInstructions" value={instructionsValue} />
            <input type="hidden" name="referenceUrl" value={referenceValue} />
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div>
                    <label htmlFor="drawingInstructions" className="ps-4 block text-md font-medium text-primary-content mb-1">
                        Reference Style
                    </label>
                    <label htmlFor="drawingInstructions" className="ps-4 block text-sm font-medium text-slate-400 dark:text-slate-600 mb-1">
                        Pick an image from your local files to use as a style reference.
                    </label>
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        disabled={isAnalyzing}
                        className="btn btn-secondary btn-outline mt-2"
                    >
                        Pick from local files
                    </button>
                </div>

                {displaySrc && !imgError && (
                    <div className="w-full flex justify-center relative">
                        <img
                            src={displaySrc}
                            alt="Style Reference"
                            className={`max-h-[60vh] object-contain rounded border border-slate-200 dark:border-slate-600 shadow-sm ${isAnalyzing ? 'opacity-40 blur-[2px] transition-all' : ''}`}
                            onError={() => setImgError(true)}
                        />
                        {isAnalyzing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 dark:bg-black/30 rounded">
                                <div className="bg-white/95 dark:bg-slate-800/95 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 animate-fade-in">
                                    <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 animate-pulse">Analyzing style reference image...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isAnalyzing && !displaySrc && (
                    <div className="w-full flex justify-center p-8">
                        <div className="bg-base-200 p-6 rounded-xl border border-base-content/10 flex flex-col items-center gap-3">
                            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-semibold">Analyzing style reference image...</span>
                        </div>
                    </div>
                )}
                {referenceValue && imgError && (
                    <div className="mt-2 w-full flex justify-center text-sm text-red-500">
                        Image could not be loaded. If this is a local blob URL, it may have expired.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Pick a Local Image</h3>
                        {localImages.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 py-8 text-center">No images found in the connected folder.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                                {localImages.map(image => (
                                    <div
                                        key={image.name}
                                        onClick={() => handleFileSelect(image.name)}
                                        className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 hover:border-primary hover:shadow-md flex flex-col items-center justify-center gap-2 transition-all overflow-hidden"
                                    >
                                        <div className="aspect-square w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative rounded overflow-hidden">
                                            <img
                                                src={image.url}
                                                alt={image.name}
                                                className="w-full h-full object-contain drop-shadow-sm"
                                            />
                                        </div>
                                        <div className="text-sm text-center font-medium text-slate-700 dark:text-slate-300 break-all line-clamp-2" title={image.name}>
                                            {image.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-action">
                            <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/30" onClick={() => setIsModalOpen(false)}></div>
                </div>
            )}
        </div>
    );
}
