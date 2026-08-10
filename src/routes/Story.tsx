import { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from "react";
import StoryEditor from "@/components/StoryEditor";
import { useLoaderData, useActionData, Form } from "react-router-dom";
import { useLocalState } from '@keldan-systems/state-mutex';
import { useLiveQuery } from 'dexie-react-hooks';
import { processDb } from '@/data/process/db';
import PanelImageDisplay from "@/components/PanelImageDisplay";
import type { ImageEntry } from "@/data/process/TYPES";
import { serializeStoryMarkdown, parseStoryMarkdown } from "@/data/process/parsers";

type StoryProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Story({
  ...rest
}: PropsWithChildren<StoryProps>) {
  const loaderData = useLoaderData() as any;
  const actionData = useActionData() as any;

  // Dexie live queries for domain entities
  const story = useLiveQuery(() => processDb.story.get('main'));
  const paragraphs = useLiveQuery(() => processDb.paragraphs.toArray()) ?? [];
  const instructions = useLiveQuery(() => processDb.instructions.toArray()) ?? [];
  const liveImages = useLiveQuery(() => processDb.images.toArray()) ?? [];

  // Local state for UI display preferences
  const [isAppStartingUp] = useLocalState<boolean>('process-startup-loading', false);
  const [leftWidth, setLeftWidth] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'text' | 'images'>('text');
  const [columnsPerRow] = useLocalState<number>('writetosee-columns-per-row', 2);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  const containerRef = useRef<HTMLFormElement>(null);

  const effectiveStory = story || (loaderData?.story ? parseStoryMarkdown(loaderData.story) : undefined);
  const storyText = story ? (story.story_text || serializeStoryMarkdown(story)) : (loaderData?.story || '');

  // Build image status map from Dexie live images table
  const imageStatusMap = new Map<string, string>();
  for (const img of liveImages) {
    if (img.image_digest) {
      imageStatusMap.set(img.image_digest, img.image_status);
    }
  }

  // Flatten story paragraphs if paragraphs table is not yet populated
  let paragraphList: { paragraphNo: number; paragraphText: string; narrativeText: string }[] = [];
  if (paragraphs.length > 0) {
    paragraphList = paragraphs.map(p => ({
      paragraphNo: p.paragraph_no ?? p.paragraphNo ?? 0,
      paragraphText: p.paragraph_text || p.paragraphText || '',
      narrativeText: p.narrative_summary || p.narrativeSummary || p.narrativeText || p.paragraph_text || p.paragraphText || ''
    }));
  } else {
    for (const chap of effectiveStory?.chapters || []) {
      for (const page of chap.pages || []) {
        for (const p of page.paragraphs || []) {
          paragraphList.push({
            paragraphNo: p.paragraph_no ?? p.paragraphNo ?? 0,
            paragraphText: p.paragraph_text || p.paragraphText || '',
            narrativeText: p.narrative_summary || p.narrativeSummary || p.narrativeText || p.paragraph_text || p.paragraphText || ''
          });
        }
      }
    }
  }

  console.log('[TRACE:STORY] Render Story component:', {
    hasStory: Boolean(story),
    paragraphsCount: paragraphs.length,
    instructionsCount: instructions.length,
    liveImagesCount: liveImages.length,
    isAppStartingUp,
    imageStatusMap: Array.from(imageStatusMap.entries())
  });

  const panels = paragraphList.map((p, idx) => {
    const inst = instructions.find(i =>
      (i.instructionNo === idx) ||
      (i.paragraph_no === p.paragraphNo) ||
      (i.paragraphId === p.paragraphNo)
    ) || instructions[idx];

    // Explicitly prioritize current_prompt_digest, finding the matching image entry or fallback to imageIndex
    const currentDigest = inst?.current_prompt_digest || inst?.promptDigest;
    let activeImage = currentDigest ? inst?.images?.find(img => img.promptDigest === currentDigest) : undefined;
    if (!activeImage) {
      activeImage = inst?.images?.[inst?.imageIndex || 0] || inst?.images?.[0];
    }
    const promptDigest = currentDigest || activeImage?.promptDigest || '';
    const imagePath = promptDigest ? `images/${promptDigest}.png` : '';

    const dexieStatus = promptDigest ? imageStatusMap.get(promptDigest) : undefined;
    let status = 'pending';
    if (dexieStatus === 'SAVED') {
      status = 'completed';
    } else if (dexieStatus === 'PROCESSING') {
      status = 'generating';
    } else if (dexieStatus === 'FAILED') {
      status = 'failed';
    } else if (activeImage?.status?.toLowerCase() === 'complete' || activeImage?.status?.toLowerCase() === 'saved') {
      status = 'completed';
    } else if (activeImage?.status?.toLowerCase() === 'processing') {
      status = 'generating';
    } else if (activeImage?.status?.toLowerCase() === 'failed') {
      status = 'failed';
    }

    const assignedChars = inst?.assigned_characters ?? inst?.characters ?? [];
    const charArr = Array.isArray(assignedChars) ? assignedChars : [];

    const panelObj = {
      panelNo: idx,
      paragraphNo: p.paragraphNo,
      text: p.paragraphText,
      sceneText: p.paragraphText,
      narrativeText: p.narrativeText,
      imageUrl: imagePath,
      image: imagePath,
      imageStatus: status,
      digest: promptDigest,
      images: (inst?.images || []).map((img: ImageEntry) => `images/${img.promptDigest}.png`),
      characters: charArr,
      cinematographicText: inst?.cinematographic_directions || inst?.cinematographicDirections || inst?.cinematographicText || '',
      isLocked: Boolean(inst?.is_locked ?? inst?.isLocked),
      error: activeImage?.errorMessage || activeImage?.error || inst?.error || undefined,
      errorProvider: activeImage?.errorProvider || undefined,
      errorStatus: activeImage?.errorStatus || undefined
    };

    console.log(`[TRACE:STORY] Panel ${idx}:`, {
      paragraphNo: p.paragraphNo,
      promptDigest,
      imagePath,
      dexieStatus,
      computedStatus: status,
      activeImageStatus: activeImage?.status,
      instCurrentPromptDigest: inst?.current_prompt_digest,
      instAssignedDigests: inst?.assigned_prompt_digests
    });

    return panelObj;
  });

  const isStartingUp = isAppStartingUp && panels.length === 0;

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
  }, [storyText]);

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
              defaultValue={storyText}
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
