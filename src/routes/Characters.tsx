import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type CharactersProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Characters({
  children,
  ...rest
}: PropsWithChildren<CharactersProps>) {
  useLoaderData();
  useActionData();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-4">Characters</h1>
      <p>This is the Characters page. (Loader and action are connected but currently empty)</p>
    </div>
  );
}
