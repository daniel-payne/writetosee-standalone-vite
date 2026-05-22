import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router-dom";
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
  const fetcher = useFetcher();
  const [text, setText] = useState<string>(defaultValue);
  const lastKeyRef = useRef<string>("");

  const debounceTimeoutRef = useRef<any>(null);

  // Sync state if defaultValue changes from the outside (e.g. loader loads another story)
  useEffect(() => {
    setText(defaultValue);
  }, [defaultValue]);

  // Clean up debounce timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isEnter = e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey;

    if (isEnter) {
      if (lastKeyRef.current === "Enter") {
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;
        const newValue = currentValue.substring(0, start) + "\n" + currentValue.substring(end);

        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        fetcher.submit(
          { intent: "UPDATE-STORY", story: newValue },
          { method: "post", action: "/story" }
        );
      }
      lastKeyRef.current = "Enter";
    } else {
      lastKeyRef.current = e.key;
    }
  };

  const handleMouseDown = () => {
    lastKeyRef.current = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetcher.submit(
        { intent: "UPDATE-STORY", story: newValue },
        { method: "post", action: "/story" }
      );
    }, 1000);
  };

  const handleCutPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setTimeout(() => {
      const newValue = textarea.value;
      setText(newValue);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        fetcher.submit(
          { intent: "UPDATE-STORY", story: newValue },
          { method: "post", action: "/story" }
        );
      }, 1000);
    }, 0);
  };

  return (
    <div {...rest} data-name={name} className="h-full w-full bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      <textarea
        name="story"
        value={text}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onChange={handleChange}
        onCut={handleCutPaste}
        onPaste={handleCutPaste}
        className="flex-1 w-full resize-none outline-none overflow-y-auto bg-transparent"
        placeholder="Type your story here..."
      />
    </div>
  );
}
