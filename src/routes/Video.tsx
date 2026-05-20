import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type VideoProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Video({
  children,
  ...rest
}: PropsWithChildren<VideoProps>) {
  useLoaderData();
  useActionData();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-4">Video</h1>
      <p>This is the Video page. (Loader and action are connected but currently empty)</p>
    </div>
  );
}
