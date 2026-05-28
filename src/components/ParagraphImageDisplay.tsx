import type { HTMLAttributes, PropsWithChildren } from "react";

type ComponentProps = {
  paragraph: any

  name?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function ParagraphImageDisplay({
  paragraph,

  name = 'ParagraphImageDisplay',
  children,
  ...rest
}: PropsWithChildren<ComponentProps>) {
  return (
    <div {...rest} data-name={name}>
      <div className="h-full w-full bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="text-xs p-2"> {paragraph.text}</div>
      </div>
    </div >
  );
}