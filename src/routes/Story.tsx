import { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from "react";
import StoryEditor from "@/components/StoryEditor";
import { useLoaderData, useActionData, Form } from "react-router-dom";
import { useLocalState } from '@keldan-systems/state-mutex';
import { usePublication } from "@/data/processOLD/managePublication";
import { useStory } from "@/data/processOLD/manageStory";
import { useAppStartupLoading } from "@/data/processOLD/manageStartup";
import PanelImageDisplay from "@/components/PanelImageDisplay";

type StoryProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Story({
  ...rest
}: PropsWithChildren<StoryProps>) {
  useLoaderData();
  const actionData = useActionData() as any;

  const [publication] = usePublication();
  const [story] = useStory();
  const [isAppStartingUp] = useAppStartupLoading();

  const [leftWidth, setLeftWidth] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'text' | 'images'>('text');
  const [columnsPerRow] = useLocalState<number>('writetosee-columns-per-row', 2);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  const containerRef = useRef<HTMLFormElement>(null);
  const panels = publication?.panels || [];
  const isStartingUp = isAppStartingUp && panels.length === 0;

  console.log('[STORY-DEBUG] Story component render. Panels count:', panels.length, 'Panels summary:', panels.map((p: any) => ({ panelNo: p.panelNo, image: p.image, imageStatus: p.imageStatus })));

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log('[STORY-DEBUG] Story useEffect: publication changed. Panel count:', publication?.panels?.length);
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

  if (isStartingUp) {
    return (
      <div {...rest} className={`h-full w-full min-h-0 flex flex-col items-center justify-center space-y-4 ${rest.className || ''}`}>
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 animate-pulse flex flex-col items-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-extrabold text-primary tracking-wide">Loading story & illustrations...</span>
        </div>
      </div>
    );
  }

  return (
    <div {...rest} className={`h-full w-full min-h-0 flex flex-col ${rest.className || ''}`}>
      {/* Mobile Tab Navigation (< 768px) */}
      {!isDesktop && (
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('text')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${mobileTab === 'text'
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
            className={`flex-1 py-2.5 px-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${mobileTab === 'images'
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

        {/* Resizer Divider */}
        {isDesktop && (
          <div
            onMouseDown={() => setIsDragging(true)}
            className={`w-1.5 hover:w-2 bg-slate-200 dark:bg-slate-700 hover:bg-primary transition-all cursor-col-resize z-20 flex items-center justify-center shrink-0 ${isDragging ? 'bg-primary w-2' : ''
              }`}
          >
            <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-500 rounded-full" />
          </div>
        )}

        {/* Image Grid Display Panel */}
        {(isDesktop || mobileTab === 'images') && (
          <div className="h-full overflow-y-auto flex-1 p-4 bg-slate-50 dark:bg-slate-900/50 min-h-0 relative">
            <div
              className="grid gap-6 auto-rows-max"
              style={{
                gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`
              }}
            >
              {panels.map((paragraph: any, idx: number) => (
                <PanelImageDisplay
                  key={paragraph?.digest ? `panel-${paragraph.digest}-${idx}` : `panel-idx-${idx}`}
                  paragraph={paragraph}
                  name={paragraph?.sceneText || paragraph?.text}
                  isExpanded={expandedIdx === idx}
                  onClick={() => handleToggleExpand(idx)}
                />
              ))}
            </div>
          </div>
        )}
      </Form>
    </div>
  );
}
