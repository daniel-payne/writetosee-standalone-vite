import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type ProcessProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Process({
  children,
  ...rest
}: PropsWithChildren<ProcessProps>) {
  useLoaderData();
  useActionData();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-4">Process</h1>
      <p>This is the Process page. (Loader and action are connected but currently empty)</p>
    </div>
  );
}
