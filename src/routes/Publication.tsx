import { usePublication, usePublicationLoading, usePublicationLoadingError } from "@/data/process/managePublication";
import type { HTMLAttributes } from "react";
import { useLoaderData, useActionData } from "react-router-dom";
import JSONExplorer from "@/components/JSONExplorer";

type PublicationProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Publication({
  ...rest
}: PublicationProps) {
  useLoaderData();
  useActionData();

  const [publication] = usePublication();
  const [isLoading] = usePublicationLoading();
  const [error] = usePublicationLoadingError();

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

      {/* Load states */}
      {isLoading && (
        <div className="flex items-center justify-center p-20 bg-base-100 rounded-2xl border border-base-content/5 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-sm font-semibold text-base-content/60">Loading publication database...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="alert alert-error shadow-md rounded-2xl text-left border border-error/25">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-bold text-sm">Failed to Load Publication</h3>
            <div className="text-xs opacity-80">{error}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <JSONExplorer data={publication || {}} />
      )}
    </div>
  );
}

