import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type PanelsProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Panels({
  children,
  ...rest
}: PropsWithChildren<PanelsProps>) {
  useLoaderData();
  useActionData();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-4">Panels</h1>
      <p>This is the Panels page. (Loader and action are connected but currently empty)</p>
    </div>
  );
}
