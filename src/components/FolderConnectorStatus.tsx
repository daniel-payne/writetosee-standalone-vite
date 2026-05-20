import type { HTMLAttributes, PropsWithChildren } from "react";

type FolderConnectorStatusProps = {
  hasDirectory: boolean;
  directoryName?: string | null;
  filesList?: string[] | null;
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorStatus({
  hasDirectory,
  directoryName,
  filesList,
  ...rest
}: PropsWithChildren<FolderConnectorStatusProps>) {

  // const fileCount = filesList?.length || 0;

  const manuscriptCount = filesList?.filter((file) => file.includes("manuscript.md"))?.length ?? 0;
  const styleCount = filesList?.filter((file) => file.includes("style.json"))?.length ?? 0;
  const charactersCount = filesList?.filter((file) => file.includes("characters.json"))?.length ?? 0;
  const panelsCount = filesList?.filter((file) => file.includes("panels.json"))?.length ?? 0;
  const imagesCount = filesList?.filter((file) => file.includes(".png") || file.includes(".jpg") || file.includes(".jpeg"))?.length ?? 0;

  return (
    <div {...rest}>
      <div>
        <span className="font-semibold me-2">Status:</span>
        {hasDirectory ? (
          <span className="badge badge-success gap-1">
            {directoryName} Connected
          </span>
        ) : (
          <span className="badge badge-warning gap-1">
            Not Connected
          </span>
        )}
      </div>
      {hasDirectory ? (
        <>
          <div className="flex items-center gap-1">
            {manuscriptCount === 1 ? <span className="text-success-content/70">🗹</span> : <span className="text-warning-content/70">🗷</span>}<span className="text-base-content/70">Manuscript</span>
          </div>
          <div className="flex items-center gap-1">
            {styleCount === 1 ? <span className="text-success-content/70">🗹</span> : <span className="text-warning-content/70">🗷</span>}<span className="text-base-content/70">Style</span>
          </div>
          <div className="flex items-center gap-1">
            {charactersCount === 1 ? <span className="text-success-content/70">🗹</span> : <span className="text-warning-content/70">🗷</span>}<span className="text-base-content/70">Characters</span>
          </div>
          <div className="flex items-center gap-1">
            {panelsCount === 1 ? <span className="text-success-content/70">🗹</span> : <span className="text-warning-content/70">🗷</span>}<span className="text-base-content/70">Panels</span>
          </div>
          <div className="flex items-center gap-1">
            {imagesCount > 0 ? <span className="text-success-content/70">🗹</span> : <span className="text-warning-content/70">🗷</span>}<span className="text-base-content/70">{imagesCount === 0 ? 'No images' : imagesCount === 1 ? '1 image' : imagesCount + ' images'}</span>
          </div>
        </>
      ) : (null)}
    </div>
  );
}
