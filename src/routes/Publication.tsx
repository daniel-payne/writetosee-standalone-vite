import { usePublication } from "@/data/managePublication";
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData } from "react-router-dom";

type PublicationProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Publication({
  children,
  ...rest
}: PropsWithChildren<PublicationProps>) {
  useLoaderData();
  useActionData();

  const [publication] = usePublication();

  return (
    <div {...rest} className={`p-6 ${rest.className || ''}`}>
      <pre className="text-sm font-mono whitespace-pre-wrap text-left">{JSON.stringify(publication, null, 2)}</pre>
    </div>
  );
}
