import { useState } from "react";
import type { HTMLAttributes, PropsWithChildren } from "react";

/**
 * StoryEditor
 * -----------
 * A reusable editor component for writing a story. It displays a textarea
 * pre‑filled with `defaultValue` (typically loaded from loader data). When the
 * user presses Enter twice consecutively, the component automatically submits the
 * text (including the newlines) using a `react-router-dom` fetcher with the
 * intent `UPDATE-STORY`.
 *
 * Props
 * -----
 * - `defaultValue?: string` – Initial story text.
 * - `name?: string` – Optional identifier used for the `data-name` attribute.
 * - All other HTML `div` attributes are passed through via `...rest`.
 */

type StoryEditorProps = {
  defaultValue?: string;
  name?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function StoryEditor({
  defaultValue = "",
  name = "StoryEditor",
  ...rest
}: PropsWithChildren<StoryEditorProps>) {
  const [text, setText] = useState<string>(defaultValue);
  const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);

  // Sync state if defaultValue changes from the outside (e.g. loader or cancel action)
  if (defaultValue !== prevDefaultValue) {
    setPrevDefaultValue(defaultValue);
    setText(defaultValue);
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div {...rest} data-name={name} className="h-full w-full bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <textarea
        name="story"
        value={text}
        onChange={handleChange}
        className="flex-1 w-full resize-none outline-none overflow-y-auto bg-transparent"
        placeholder="Type your story here..."
      />
    </div>
  );
}
