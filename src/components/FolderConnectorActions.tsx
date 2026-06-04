import type { HTMLAttributes, PropsWithChildren } from "react";
import { useFetcher, useRevalidator } from "react-router-dom";
import { getDirectoryHandle } from '@/data/storage/fileStorage';
import { writeLog } from '@/data/storage/logStorage';

type FolderConnectorActionsProps = {
  hasDirectory: boolean;
  permissionGranted: boolean;
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorActions({
  hasDirectory,
  permissionGranted,
  ...rest
}: PropsWithChildren<FolderConnectorActionsProps>) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

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

  const handleGrantPermission = async () => {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        revalidator.revalidate();
      }
    } catch (err) {
      await writeLog('error', 'FolderConnectorActions', `Failed to grant directory permission: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div {...rest} className={`flex flex-col gap-2 ${rest.className || ''}`}>
      {hasDirectory ? (
        <>
          {!permissionGranted && (
            <button
              onClick={handleGrantPermission}
              className="btn btn-primary btn-sm w-full font-bold"
            >
              Grant Access
            </button>
          )}
          <button
            onClick={handleDisconnectDirectory}
            className="btn btn-outline btn-error btn-sm w-full"
          >
            Disconnect Directory
          </button>
        </>
      ) : (
        <button
          onClick={handleSelectDirectory}
          className="btn btn-primary btn-sm w-full"
        >
          Select Local Directory
        </button>
      )}
    </div>
  );
}
