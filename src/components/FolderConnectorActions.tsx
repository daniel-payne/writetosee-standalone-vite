import type { HTMLAttributes, PropsWithChildren } from "react";

type FolderConnectorActionsProps = {
  hasDirectory: boolean;
  handleDisconnectDirectory: () => void;
  handleSelectDirectory: () => void;
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorActions({
  hasDirectory,
  handleDisconnectDirectory,
  handleSelectDirectory,

  ...rest
}: PropsWithChildren<FolderConnectorActionsProps>) {
  return (
    <div {...rest}>
      {hasDirectory ? (

        <button
          onClick={handleDisconnectDirectory}
          className="btn btn-outline btn-error btn-sm w-full"
        >
          Disconnect Directory
        </button>

      ) : (


        <button
          onClick={handleSelectDirectory}
          className="btn btn-primary btn-sm  w-full"
        >
          Select Local Directory
        </button>

      )}

    </div>
  );
}
