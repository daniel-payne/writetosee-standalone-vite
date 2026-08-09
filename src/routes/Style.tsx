import { Form, useLoaderData, useNavigation, useBlocker, useFetcher, useActionData } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, type HTMLAttributes, type PropsWithChildren } from "react";
import FormDrawingInstructions from "@/components/FormDrawingInstructions";
import FormReferenceLink from "@/components/FormReferenceLink";
import FormStoryTitle from "@/components/FormStoryTitle";
import { useLocalState } from "@keldan-systems/state-mutex";
import { useLiveQuery } from "dexie-react-hooks";
import { processDb } from "@/data/process/db";
import type { Style as StyleType } from "@/data/process/TYPES";
import { STYLE_PRESETS } from "@/data/stylePresets";

type StyleProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Style({
  ...rest
}: PropsWithChildren<StyleProps>) {
  useLoaderData();
  const navigation = useNavigation();
  const actionData = useActionData() as any;

  // Dexie live query for style
  const liveStyle = useLiveQuery(() => processDb.style.get('main'));
  const [styleMutex] = useLocalState<StyleType | undefined>('style-data', undefined);
  const [styleHash] = useLocalState<string>('style-hash', '');

  const style = liveStyle || styleMutex;

  const safeJoin = (val: unknown): string => {
    if (Array.isArray(val)) {
      return val.join('\n');
    }
    return typeof val === 'string' ? val : '';
  };

  const initialStyle: any = style ?? {};

  const [formData, setFormData] = useState({
    storyTitle: initialStyle.story_title || initialStyle.storyTitle || '',
    drawingInstructions: safeJoin(initialStyle.drawing_instructions || initialStyle.drawingInstructions),
    referenceUrl: initialStyle.reference_url || initialStyle.referenceUrl || '',
    linkInstructions: safeJoin(initialStyle.linkInstructions || initialStyle.reference_instructions || initialStyle.referenceInstructions),
  });

  useEffect(() => {
    if (actionData?.cancelled) {
      const currentSaved: any = style ?? {};
      setFormData({
        storyTitle: currentSaved.story_title || currentSaved.storyTitle || '',
        drawingInstructions: safeJoin(currentSaved.drawing_instructions || currentSaved.drawingInstructions),
        referenceUrl: currentSaved.reference_url || currentSaved.referenceUrl || '',
        linkInstructions: safeJoin(currentSaved.linkInstructions || currentSaved.reference_instructions || currentSaved.referenceInstructions),
      });
    }
  }, [actionData, style]);

  const fetcher = useFetcher();
  const wasLoadingRef = useRef(false);
  const isAnalyzing = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.state !== 'idle') {
      wasLoadingRef.current = true;
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (fetcher.state === 'idle' && wasLoadingRef.current) {
      wasLoadingRef.current = false;
      if (fetcher.data?.success && fetcher.data?.linkInstructions) {
        Promise.resolve().then(() => {
          setFormData(prev => ({
            ...prev,
            linkInstructions: fetcher.data.linkInstructions,
            drawingInstructions: fetcher.data.linkInstructions
          }));
        });
      }
    }
  }, [fetcher.state, fetcher.data]);

  const lastSyncedHashRef = useRef(styleHash);
  const lastSyncedStyleRef = useRef(style);
  useEffect(() => {
    const hashChanged = styleHash && styleHash !== lastSyncedHashRef.current;
    const dataChanged = style !== undefined && style !== lastSyncedStyleRef.current;
    if (hashChanged && dataChanged) {
      lastSyncedHashRef.current = styleHash;
      lastSyncedStyleRef.current = style;
      setFormData({
        storyTitle: (style as any)?.story_title || (style as any)?.storyTitle || '',
        drawingInstructions: safeJoin(style?.drawing_instructions || style?.drawingInstructions),
        referenceUrl: style?.reference_url || style?.referenceUrl || '',
        linkInstructions: safeJoin((style as any)?.linkInstructions || style?.reference_instructions || style?.referenceInstructions),
      });
    }
  }, [styleHash, style]);

  const isDirty =
    formData.storyTitle !== ((initialStyle.story_title || initialStyle.storyTitle) || '') ||
    formData.drawingInstructions !== safeJoin(initialStyle.drawing_instructions || initialStyle.drawingInstructions) ||
    formData.referenceUrl !== (initialStyle.reference_url || initialStyle.referenceUrl || '') ||
    formData.linkInstructions !== safeJoin(initialStyle.linkInstructions || initialStyle.reference_instructions || initialStyle.referenceInstructions);

  const isDirtyRef = useRef(isDirty);
  const navigationStateRef = useRef(navigation.state);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    navigationStateRef.current = navigation.state;
  }, [navigation.state]);

  const blockerFunction = useCallback(
    ({ currentLocation, nextLocation }: any) => {
      if (!isDirtyRef.current) return false;
      if (navigationStateRef.current !== 'idle') return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return true;
    },
    []
  );

  const blocker = useBlocker(blockerFunction);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePresetSelect = (presetKey: string) => {
    let newInstructions = '';
    if (presetKey === 'CHILDREN') {
      newInstructions = STYLE_PRESETS.CHILDRENS_BOOK.trim();
    } else if (presetKey === 'GRAPHIC') {
      newInstructions = STYLE_PRESETS.GRAPHIC_NOVEL.trim();
    } else if (presetKey === 'PHOTO_REALISTIC') {
      newInstructions = STYLE_PRESETS.PHOTO_REALISTIC.trim();
    } else if (presetKey === 'MANGA') {
      newInstructions = STYLE_PRESETS.MANGA_COMIC.trim();
    } else if (presetKey === 'SUPERHERO') {
      newInstructions = STYLE_PRESETS.SUPERHERO_COMIC.trim();
    } else if (presetKey === 'CLAYMATION') {
      newInstructions = STYLE_PRESETS.CLAYMATION.trim();
    } else if (presetKey === 'REFERENCE') {
      const existingRef = (formData.linkInstructions || '').trim();
      if (!existingRef) {
        if (formData.referenceUrl) {
          fetcher.submit(
            { intent: 'UPDATE_REFERENCE', referenceUrl: formData.referenceUrl },
            { method: 'post' }
          );
        }
        return;
      } else {
        newInstructions = existingRef;
      }
    }

    setFormData(prev => ({
      ...prev,
      drawingInstructions: newInstructions
    }));
  };

  return (
    <div {...rest} className={`p-4 w-full mx-auto h-full overflow-auto ${rest.className || ''}`}>
      <Form id="main-form" method="post" className="flex flex-row w-full h-full items-strech justify-between gap-2">
        <div className="flex-1 card bg-base-100 shadow-xl border border-base-content/5 h-full flex flex-col overflow-hidden">
          <div className="card-body flex-1 flex flex-col min-h-0">
            <FormStoryTitle value={formData.storyTitle} onChange={handleChange} />
            <FormDrawingInstructions
              value={formData.drawingInstructions}
              isAnalyzing={isAnalyzing}
              onChange={handleChange}
              onPresetSelect={handlePresetSelect}
            />
          </div>
        </div>

        <div className="flex-1 card bg-base-100 shadow-xl border border-base-content/5 h-full flex flex-col overflow-hidden">
          <div className="card-body overflow-auto flex-1 flex flex-col min-h-0">
            <FormReferenceLink
              referenceValue={formData.referenceUrl}
              instructionsValue={formData.linkInstructions}
              isAnalyzing={isAnalyzing}
              onChange={handleChange}
            />
          </div>
        </div>
      </Form>
    </div>
  );
}
