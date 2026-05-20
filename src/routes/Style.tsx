import { Form, useLoaderData, useNavigation, useBlocker } from "react-router-dom";
import { useState, useEffect, type HTMLAttributes, type PropsWithChildren } from "react";
import FormDrawingInstructions from "../components/FormDrawingInstructions";
import FormReferenceLink from "../components/FormReferenceLink";
import FormStoryTitle from "../components/FormStoryTitle";

type StyleProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Style({
  children,
  ...rest
}: PropsWithChildren<StyleProps>) {
  const loaderData = useLoaderData() as any;
  const navigation = useNavigation();

  const initialStyle = loaderData?.style ?? {};

  const [formData, setFormData] = useState({
    storyTitle: initialStyle.storyTitle || '',
    drawingInstructions: (initialStyle.drawingInstructions || []).join('\n'),
    linkUrl: initialStyle.linkUrl || '',
    linkInstructions: (initialStyle.linkInstructions || []).join('\n'),
  });

  const isDirty = 
    formData.storyTitle !== (initialStyle.storyTitle || '') ||
    formData.drawingInstructions !== (initialStyle.drawingInstructions || []).join('\n') ||
    formData.linkUrl !== (initialStyle.linkUrl || '') ||
    formData.linkInstructions !== (initialStyle.linkInstructions || []).join('\n');

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

  useEffect(() => {
    setFormData({
      storyTitle: initialStyle.storyTitle || '',
      drawingInstructions: (initialStyle.drawingInstructions || []).join('\n'),
      linkUrl: initialStyle.linkUrl || '',
      linkInstructions: (initialStyle.linkInstructions || []).join('\n'),
    });
  }, [initialStyle]);

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isSubmitting = navigation.state === 'submitting';

  return (
    <div {...rest} className={`p-6 w-full max-w-5xl mx-auto h-full overflow-auto ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-6 text-primary-content">Style</h1>
      <h2 className="text-lg font-bold mb-6 text-black/20">
        <p>Here you describe the style you want your story to be illustrated in, </p>
        <p>You can either provide a link to an image, or describe it in words, or both. </p>
        <p>The more detail you provide, the better the illustrations will match your vision.</p>
      </h2>

      <Form id="main-form" method="post" className="space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">

        <FormStoryTitle value={formData.storyTitle} onChange={handleChange} />

        <FormDrawingInstructions value={formData.drawingInstructions} onChange={handleChange} />

        <FormReferenceLink linkValue={formData.linkUrl} instructionsValue={formData.linkInstructions} onChange={handleChange} />




      </Form>
    </div>
  );
}
