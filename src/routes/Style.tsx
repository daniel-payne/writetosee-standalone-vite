import { Form, useLoaderData, useNavigation, useBlocker } from "react-router-dom";
import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import FormDrawingInstructions from "@/components/FormDrawingInstructions";
import FormReferenceLink from "@/components/FormReferenceLink";
import FormStoryTitle from "@/components/FormStoryTitle";
import { useStyle } from "@/data/manageStyle";

type StyleProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Style({
  ...rest
}: PropsWithChildren<StyleProps>) {
  useLoaderData();
  const navigation = useNavigation();

  const [style] = useStyle();
  const [prevStyle, setPrevStyle] = useState(style);
  const initialStyle = style ?? {};

  const safeJoin = (val: unknown): string => {
    if (Array.isArray(val)) {
      return val.join('\n');
    }
    return typeof val === 'string' ? val : '';
  };

  const [formData, setFormData] = useState({
    storyTitle: initialStyle.storyTitle || '',
    drawingInstructions: safeJoin(initialStyle.drawingInstructions),
    linkUrl: initialStyle.linkUrl || '',
    linkInstructions: safeJoin(initialStyle.linkInstructions),
  });

  if (style !== prevStyle) {
    setPrevStyle(style);
    const updatedStyle = style ?? {};
    setFormData({
      storyTitle: updatedStyle.storyTitle || '',
      drawingInstructions: safeJoin(updatedStyle.drawingInstructions),
      linkUrl: updatedStyle.linkUrl || '',
      linkInstructions: safeJoin(updatedStyle.linkInstructions),
    });
  }

  const isDirty =
    formData.storyTitle !== (initialStyle.storyTitle || '') ||
    formData.drawingInstructions !== safeJoin(initialStyle.drawingInstructions) ||
    formData.linkUrl !== (initialStyle.linkUrl || '') ||
    formData.linkInstructions !== safeJoin(initialStyle.linkInstructions);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (!isDirty) return false;
      if (navigation.state !== 'idle') return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return true;
    }
  );

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



  return (
    <div {...rest} className={`p-4 w-full mx-auto h-full overflow-auto ${rest.className || ''}`}>

      <Form id="main-form" method="post" className="flex flex-row w-full h-full items-strech justify-between gap-2">

        <div className="flex-1 card bg-base-100 shadow-xl border border-base-content/5 h-full flex flex-col overflow-hidden">
          <div className="card-body flex-1 flex flex-col min-h-0">
            <FormStoryTitle value={formData.storyTitle} onChange={handleChange} />

            <FormDrawingInstructions value={formData.drawingInstructions} onChange={handleChange} />
          </div>
        </div>


        <div className="flex-1 card bg-base-100 shadow-xl border border-base-content/5 h-full flex flex-col overflow-hidden">
          <div className="card-body overflow-auto flex-1 flex flex-col min-h-0">
            <FormReferenceLink linkValue={formData.linkUrl} instructionsValue={formData.linkInstructions} onChange={handleChange} />
          </div>
        </div>
      </Form>
    </div>
  );
}
