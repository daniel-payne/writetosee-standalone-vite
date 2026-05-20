import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type ComicProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Comic({
  children,
  ...rest
}: PropsWithChildren<ComicProps>) {
  const loaderData = useLoaderData();
  const actionData = useActionData();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-4">Comic</h1>
      <p>This is the Comic page. (Loader and action are connected but currently empty)</p>
    </div>
  );
}
