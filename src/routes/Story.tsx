import { useState, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type StoryProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Story({
  children,
  ...rest
}: PropsWithChildren<StoryProps>) {
  const loaderData = useLoaderData();
  const actionData = useActionData();

  const [leftWidth, setLeftWidth] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div {...rest} className={`h-full w-full ${rest.className || ''}`}>
      <div ref={containerRef} className="flex flex-row gap-0 justify-between items-stretch h-full w-full">
        <div className="" style={{ width: `${leftWidth}%` }}>
          <div className="h-full w-full bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <textarea className="h-full w-full resize-none outline-none overflow-y-auto bg-transparent" placeholder="Manuscript" />
          </div>
        </div>
        <div
          className={`divider divider-horizontal m-0 p-1 cursor-col-resize hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors relative z-10 ${isDragging ? 'bg-slate-200/50 dark:bg-slate-700/50' : ''}`}
          onMouseDown={() => setIsDragging(true)}
        />
        <div className=" flex-1">
          <div>
            <pre>{JSON.stringify(loaderData, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
