import { Form, useLoaderData, useNavigation, useBlocker, useFetcher } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, type HTMLAttributes, type PropsWithChildren } from "react";
import FormDrawingInstructions from "@/components/FormDrawingInstructions";
import FormReferenceLink from "@/components/FormReferenceLink";
import FormStoryTitle from "@/components/FormStoryTitle";
import { useStyle, useStyleHash } from "@/data/manageStyle";
import { STYLE_PRESETS } from "@/data/stylePresets";

type StyleProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Style({
  ...rest
}: PropsWithChildren<StyleProps>) {
  useLoaderData();
  const navigation = useNavigation();

  const [style] = useStyle();
  const [styleHash] = useStyleHash();

  const safeJoin = (val: unknown): string => {
    if (Array.isArray(val)) {
      return val.join('\n');
    }
    return typeof val === 'string' ? val : '';
  };

  const initialStyle = style ?? {};

  const [formData, setFormData] = useState({
    storyTitle: initialStyle.storyTitle || '',
    drawingInstructions: safeJoin(initialStyle.drawingInstructions),
    referenceUrl: initialStyle.referenceUrl || '',
    linkInstructions: safeJoin(initialStyle.linkInstructions),
  });

  const fetcher = useFetcher();
  const wasLoadingRef = useRef(false);
  const isAnalyzing = fetcher.state !== 'idle';

  useEffect(() => {
    console.log("Style.tsx: Fetcher state changed:", fetcher.state, "wasLoadingRef:", wasLoadingRef.current);
    if (fetcher.state !== 'idle') {
      wasLoadingRef.current = true;
    }
  }, [fetcher.state]);

  useEffect(() => {
    console.log("Style.tsx: Fetcher idle check - state:", fetcher.state, "wasLoadingRef:", wasLoadingRef.current, "data:", fetcher.data);
    if (fetcher.state === 'idle' && wasLoadingRef.current) {
      wasLoadingRef.current = false;
      console.log("Style.tsx: Fetcher completed! success:", fetcher.data?.success, "linkInstructions length:", fetcher.data?.linkInstructions?.length);
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

  // Cross-tab sync: when another tab saves, localStorage 'style-hash' changes which updates
  // styleHash here. But the style data object only updates after the async loadStyle() call
  // in the storage listener completes. We track both: only sync formData once BOTH have
  // moved (new hash + new style object reference), preventing the race where styleHash is
  // new but style still holds the previous tab's stale data.
  const lastSyncedHashRef = useRef(styleHash);
  const lastSyncedStyleRef = useRef(style);
  useEffect(() => {
    const hashChanged = styleHash && styleHash !== lastSyncedHashRef.current;
    const dataChanged = style !== null && style !== lastSyncedStyleRef.current;
    if (hashChanged && dataChanged) {
      lastSyncedHashRef.current = styleHash;
      lastSyncedStyleRef.current = style;
      setFormData({
        storyTitle: style.storyTitle || '',
        drawingInstructions: safeJoin(style.drawingInstructions),
        referenceUrl: style.referenceUrl || '',
        linkInstructions: safeJoin(style.linkInstructions),
      });
    }
  }, [styleHash, style]);

  const isDirty =
    formData.storyTitle !== (initialStyle.storyTitle || '') ||
    formData.drawingInstructions !== safeJoin(initialStyle.drawingInstructions) ||
    formData.referenceUrl !== (initialStyle.referenceUrl || '') ||
    formData.linkInstructions !== safeJoin(initialStyle.linkInstructions);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const navigationStateRef = useRef(navigation.state);
  navigationStateRef.current = navigation.state;

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
    console.log("handleChange called: name =", e.target.name, "value =", e.target.value);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePresetSelect = (presetKey: string) => {
    console.log("handlePresetSelect called in Style.tsx with key:", presetKey);
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
