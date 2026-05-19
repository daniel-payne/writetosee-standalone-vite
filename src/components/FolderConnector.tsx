import type { HTMLAttributes, PropsWithChildren } from "react";
import FolderConnectorHeader from "./FolderConnectorHeader";
import FolderConnectorStatus from "./FolderConnectorStatus";
import FolderConnectorActions from "./FolderConnectorActions";
// import FolderConnectorForm from "./FolderConnectorForm";

type FolderConnectorProps = {
  name?: string;
  hasDirectory: boolean;
  directoryName?: string | null;
  filesList: string[];
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnector({
  name = "FolderConnector",
  hasDirectory,
  directoryName,
  filesList,
  ...rest
}: PropsWithChildren<FolderConnectorProps>) {
  const handleDisconnectDirectory = () => { }
  const handleSelectDirectory = () => { }

  return (
    <div {...rest} data-name={name} className={`space-y-8 ${rest.className || ''}`}>
      {/* Directory settings */}
      <div className="h-full w-full card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-title p-4">
          <FolderConnectorHeader className="card-title text-xl font-bold flex items-center gap-2" />
        </div>
        <div className="card-body">
          <FolderConnectorStatus
            hasDirectory={hasDirectory}
            directoryName={directoryName}
          />
        </div>
        <div className="card-actions p-2">
          <FolderConnectorActions
            className="w-full p-4"
            hasDirectory={hasDirectory}
            handleDisconnectDirectory={handleDisconnectDirectory}
            handleSelectDirectory={handleSelectDirectory}
          />
        </div>
      </div>
    </div>
  );
}
