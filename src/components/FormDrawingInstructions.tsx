import React from 'react';

interface FormDrawingInstructionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  isAnalyzing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPresetSelect: (styleKey: string) => void;
  name?: string;
}

export default function FormDrawingInstructions({ 
  name = 'FormDrawingInstructions', 
  value, 
  isAnalyzing,
  onChange, 
  onPresetSelect,
  ...rest 
}: FormDrawingInstructionsProps) {

  const handleUseInstructions = (styleKey: string) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    onPresetSelect(styleKey);
  }

  return (
    <div {...rest} data-name={name} className={`flex-1 flex flex-col min-h-0 ${rest.className || ''}`}>
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div>
            <label htmlFor="drawingInstructions" className="ps-4 block text-md font-medium text-primary-content mb-1">
              Drawing Instructions
            </label>
            <label htmlFor="drawingInstructions" className="ps-4 block text-sm font-medium text-slate-400 dark:text-slate-600 mb-1">
              These instructions describe how you want the images in your story to be drawn.
            </label>

          </div>
          <textarea
            name="drawingInstructions"
            id="drawingInstructions"
            value={value}
            onChange={onChange}
            disabled={isAnalyzing}
            className="w-full flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none dark:bg-slate-700 dark:text-white min-h-0 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-row gap-2 justify-center items-center">
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('CHILDREN')}>Children's Book</button>
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('GRAPHIC')}>Graphic Novel</button>
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('MANGA')}>Manga Comic</button>
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('SUPERHERO')}>Superhero Comic</button>
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('CLAYMATION')}>Claymation</button>
          <button className="btn btn-secondary btn-outline" disabled={isAnalyzing} onClick={handleUseInstructions('REFERENCE')}>Reference Style</button>
        </div>
      </div>
    </div>
  );
}
