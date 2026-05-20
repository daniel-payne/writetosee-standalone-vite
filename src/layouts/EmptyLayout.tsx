import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData } from 'react-router-dom';
import type { EmptyLayoutLoaderData } from './EmptyLayout.loader';

type EmptyLayoutProps = {} & HTMLAttributes<HTMLDivElement>;

export default function EmptyLayout({
  children,
  ...rest
}: PropsWithChildren<EmptyLayoutProps>) {
  const loaderData = useLoaderData() as EmptyLayoutLoaderData;

  return (
    <div
      {...rest}
      className={`h-screen overflow-hidden bg-gradient-to-br from-base-300 via-base-100 to-base-200 text-base-content flex flex-col font-sans transition-all duration-300 ${rest.className || ''}`}
    >
      <main className="flex-1 overflow-y-auto w-full flex flex-col">
        <div className="w-full flex-1 mx-auto px-0 py-0 animate-fade-in flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
