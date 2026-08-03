import { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from "react";
import StoryEditor from "@/components/StoryEditor";
import { useLoaderData, useActionData, Form } from "react-router-dom";
import { usePublication } from "@/data/process/managePublication";
import { useStory } from "@/data/process/manageStory";
import PanelImageDisplay from "@/components/PanelImageDisplay";

type StoryProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Story({
  ...rest
}: PropsWithChildren<StoryProps>) {
  useLoaderData();
  const actionData = useActionData() as any;

  const [publication] = usePublication();
  const [story] = useStory();

  const [leftWidth, setLeftWidth] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'text' | 'images'>('text');
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  const containerRef = useRef<HTMLFormElement>(null);
  const panels = publication?.panels || [];

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setExpandedIdx(null);
  }, [publication]);

  const handleToggleExpand = (idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newLeftWidth < 10) newLeftWidth = 10;
      if (newLeftWidth > 90) newLeftWidth = 90;

      setLeftWidth(newLeftWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  return (
    <div {...rest} className={`h-full w-full min-h-0 flex flex-col ${rest.className || ''}`}>
      {/* Mobile Tab Navigation (< 768px) */}
      {!isDesktop && (
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('text')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              mobileTab === 'text'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Story Text
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('images')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              mobileTab === 'images'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Images ({panels.length})
          </button>
        </div>
      )}

      <Form id="main-form" method="post" className="flex-1 flex flex-col md:flex-row gap-0 justify-between items-stretch h-full w-full min-h-0 overflow-hidden" ref={containerRef}>
        {/* Story Text Editor Panel */}
        {(isDesktop || mobileTab === 'text') && (
          <div
            className="h-full overflow-hidden flex-1 md:flex-none"
            style={isDesktop ? { width: `${leftWidth}%` } : undefined}
          >
            <StoryEditor
              key={actionData?.timestamp ? `cancel-${actionData.timestamp}` : 'story-editor'}
              defaultValue={story}
            />
          </div>
        )}

        {/* Draggable Divider (Desktop only) */}
        {isDesktop && (
          <div
            className={`divider divider-horizontal m-0 p-1 cursor-col-resize hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors relative z-10 hidden md:flex ${
              isDragging ? 'bg-slate-200/50 dark:bg-slate-700/50' : ''
            }`}
            onMouseDown={() => setIsDragging(true)}
          />
        )}

        {/* Image Cards Panel */}
        {(isDesktop || mobileTab === 'images') && (
          <div
            className="flex-1 h-full overflow-hidden flex flex-col"
            style={isDesktop ? { width: `${100 - leftWidth}%` } : undefined}
          >
            {expandedIdx !== null ? (
              <div className="h-full w-full p-4 overflow-auto flex flex-col">
                {panels[expandedIdx] && (
                  <PanelImageDisplay
                    paragraph={{ ...panels[expandedIdx], panelNo: expandedIdx }}
                    isExpanded={true}
                    className="w-full h-full"
                    onDoubleClick={() => handleToggleExpand(expandedIdx)}
                  />
                )}
              </div>
            ) : (
                <div className="h-full w-full p-4 overflow-auto grid grid-cols-1 gap-4 max-w-md mx-auto md:max-w-none md:grid-cols-2 md:landscape:flex md:landscape:flex-row md:landscape:flex-wrap md:landscape:justify-start md:landscape:content-start md:landscape:gap-3">
                {panels.map((paragraph: any, idx: number) => (
                  <PanelImageDisplay
                    key={idx}
                    paragraph={{ ...paragraph, panelNo: idx }}
                    isExpanded={false}
                    className="w-full aspect-square md:landscape:h-[calc(50%-0.5rem)] md:landscape:min-h-[200px] md:landscape:max-h-[440px] md:landscape:w-auto md:landscape:aspect-square flex-none"
                    onDoubleClick={() => handleToggleExpand(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Form>
    </div>
  );
}
