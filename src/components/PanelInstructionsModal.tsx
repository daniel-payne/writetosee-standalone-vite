import { useState, useEffect } from 'react';
import { useCharacters } from '@/data/process/manageCharacters';

interface PanelInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelNo: number;
  currentCharacters?: string[];
  currentCinematographicText?: string;
  currentIsLocked?: boolean;
  onSave: (data: { characters: string[]; cinematographicText: string; isLocked: boolean }) => void;
}

export default function PanelInstructionsModal({
  isOpen,
  onClose,
  panelNo,
  currentCharacters = [],
  currentCinematographicText = '',
  currentIsLocked = false,
  onSave
}: PanelInstructionsModalProps) {
  const [allCharacters] = useCharacters();
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(currentCharacters);
  const [cinematographicText, setCinematographicText] = useState<string>(currentCinematographicText);
  const [isLocked, setIsLocked] = useState<boolean>(currentIsLocked);

  useEffect(() => {
    if (isOpen) {
      setSelectedCharacters(currentCharacters);
      setCinematographicText(currentCinematographicText);
      setIsLocked(currentIsLocked);
    }
  }, [isOpen, currentCharacters, currentCinematographicText, currentIsLocked]);

  if (!isOpen) return null;

  const isCharSelected = (name: string) => {
    const norm = name.trim().toLowerCase();
    return selectedCharacters.some(s => s.trim().toLowerCase() === norm);
  };

  const toggleCharacter = (name: string) => {
    setSelectedCharacters((prev) => {
      const norm = name.trim().toLowerCase();
      if (prev.some(s => s.trim().toLowerCase() === norm)) {
        return prev.filter((c) => c.trim().toLowerCase() !== norm);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSave = () => {
    onSave({
      characters: selectedCharacters,
      cinematographicText: cinematographicText.trim(),
      isLocked
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-xl w-full flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Panel {panelNo + 1} Instructions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign characters, add camera/drawing guidance, or lock image redraws.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-slate-500 hover:text-slate-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 max-h-[70vh]">
          {/* Lock Image Switch */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock Panel Image
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                When locked, this image will not be redrawn automatically if the story text or global style changes.
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm shrink-0"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
            />
          </div>

          {/* Character Assignment */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Characters in Scene
            </label>
            {allCharacters.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                No characters defined yet in Characters tab.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allCharacters.map((char) => {
                  const isSelected = isCharSelected(char.name);
                  return (
                    <button
                      key={char.name}
                      type="button"
                      onClick={() => toggleCharacter(char.name)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="checkbox checkbox-primary checkbox-xs pointer-events-none"
                      />
                      <span className="truncate">{char.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cinematographic Text */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Cinematographic Directions
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Add free-form instructions to guide drawing (e.g. lighting, camera position, &ldquo;remove figure&rdquo;, &ldquo;redraw window&rdquo;).
            </p>
            <textarea
              className="textarea textarea-bordered w-full h-28 text-xs leading-relaxed focus:textarea-primary bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder="e.g. Low angle camera shot, dramatic sunset lighting from the right. Remove the figure in the background."
              value={cinematographicText}
              onChange={(e) => setCinematographicText(e.target.value)}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost text-xs normal-case"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-sm btn-primary text-white text-xs normal-case font-bold px-4 shadow-sm"
          >
            Save Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
