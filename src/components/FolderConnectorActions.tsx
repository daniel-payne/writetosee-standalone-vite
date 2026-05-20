import type { HTMLAttributes, PropsWithChildren } from "react";
import { useFetcher } from "react-router-dom";

type FolderConnectorActionsProps = {
  hasDirectory: boolean;

} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorActions({
  hasDirectory,


  ...rest
}: PropsWithChildren<FolderConnectorActionsProps>) {
  const fetcher = useFetcher();

  const handleDisconnectDirectory = () => {
    fetcher.submit(
      { intent: 'DISCONNECT-DIRECTORY' },
      { method: 'post', action: '/' }
    );
  }

  const handleSelectDirectory = () => {
    fetcher.submit(
      { intent: 'SELECT-DIRECTORY' },
      { method: 'post', action: '/' }
    );
  }

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
