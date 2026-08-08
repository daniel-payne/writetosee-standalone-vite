import { useLocalState } from "@keldan-systems/state-mutex";
import type { HTMLAttributes } from "react";
import { useLoaderData, useActionData } from "react-router-dom";
import JSONExplorer from "@/components/JSONExplorer";
import type { Story, Style, Character, Instruction } from "@/data/process/TYPES";

type PublicationProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Publication({
  ...rest
}: PublicationProps) {
  useLoaderData();
  useActionData();

  const [story] = useLocalState<Story | undefined>('story-data', undefined);
  const [style] = useLocalState<Style | undefined>('style-data', undefined);
  const [characters] = useLocalState<Character[]>('characters-data', []);
  const [instructions] = useLocalState<Instruction[]>('instructions-data', []);

  const publication = {
    story,
    style,
    characters,
    instructions
  };

  return (
    <div {...rest} className={`p-6 w-full mx-auto max-w-7xl flex flex-col gap-6 ${rest.className || ''}`}>
      {/* Page Header */}
      <div className="flex flex-col gap-1 text-left border-b border-base-content/10 pb-4">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Publication Data
        </h1>
        <p className="text-sm text-base-content/60 font-medium">
          Inspect, explore, and download the compiled story database structure.
        </p>
      </div>

      {/* Main Content */}
      <JSONExplorer data={publication} />
    </div>
  );
}
