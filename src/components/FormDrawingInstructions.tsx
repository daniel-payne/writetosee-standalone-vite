import React from 'react';

interface FormDrawingInstructionsProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  name?: string;
}

export default function FormDrawingInstructions({ name = 'FormDrawingInstructions', value, onChange, ...rest }: FormDrawingInstructionsProps) {
  const handleUseInstructions = (_style: string) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div {...rest} data-name={name}    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <label htmlFor="drawingInstructions" className="ps-4 block text-md font-medium text-primary-content mb-1">
            Drawing Instructions
          </label>
          <label htmlFor="drawingInstructions" className="ps-4 block text-sm font-medium text-slate-400 dark:text-slate-600 mb-1">
            These instructions describe how you want the images in your story to be drawn.
          </label>
          <textarea
            name="drawingInstructions"
            id="drawingInstructions"
            rows={16}
            value={value}
            onChange={onChange}
            className="w-full flex-grow px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="flex flex-row gap-2 justify-center items-center">
          <button className="btn btn-secondary btn-outline" onClick={handleUseInstructions('CHILDRENS_BOOK')}>Childrens Book</button>
          <button className="btn btn-secondary btn-outline" onClick={handleUseInstructions('GRAPHIC_NOVEL')}>Graphic Novel</button>
        </div>
      </div>
    </div>
  );
}
