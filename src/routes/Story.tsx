import { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from "react";
import StoryEditor from "../components/StoryEditor";
import { useLoaderData, useActionData, Form } from "react-router-dom";
import type { StoryLoaderData } from "./Story.loader";
import { useLocalState } from "@keldan-systems/state-mutex";

type StoryProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Story({
  children,
  ...rest
}: PropsWithChildren<StoryProps>) {
  const loaderData = useLoaderData() as StoryLoaderData;
  useActionData();

  const [publication] = useLocalState('publication-data', {})

  const [leftWidth, setLeftWidth] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

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
    <div {...rest} className={`h-full w-full min-h-0 ${rest.className || ''}`}>
      <Form id="main-form" method="post" className="flex flex-row gap-0 justify-between items-stretch h-full w-full min-h-0" ref={containerRef}>
        <div className="h-full overflow-hidden" style={{ width: `${leftWidth}%` }}>
          <StoryEditor defaultValue={loaderData.story} />
        </div>
        <div
          className={`divider divider-horizontal m-0 p-1 cursor-col-resize hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors relative z-10 ${isDragging ? 'bg-slate-200/50 dark:bg-slate-700/50' : ''}`}
          onMouseDown={() => setIsDragging(true)}
        />
        <div className="flex-1 h-full overflow-hidden">
          <div className="h-full w-full overflow-auto p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap text-left">{JSON.stringify(publication, null, 2)}</pre>
          </div>
        </div>
      </Form>
    </div>
  );
}
