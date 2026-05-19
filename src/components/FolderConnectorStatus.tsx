import type { HTMLAttributes, PropsWithChildren } from "react";

type FolderConnectorStatusProps = {
  hasDirectory: boolean;
  directoryName?: string | null;
  directoryFullName?: string | null;
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorStatus({
  hasDirectory,
  directoryName,
  directoryFullName,
  ...rest
}: PropsWithChildren<FolderConnectorStatusProps>) {
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
    </div>
  );
}
