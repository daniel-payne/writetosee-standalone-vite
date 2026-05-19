import type { HTMLAttributes, PropsWithChildren } from "react";

type FolderConnectorFormProps = {
  hasDirectory: boolean;
  refreshFiles: () => void;
  filesList: string[];
  handlePreviewFile: (name: string) => void;
} & HTMLAttributes<HTMLDivElement>;

export default function FolderConnectorForm({
  hasDirectory,
  refreshFiles,
  filesList,
  handlePreviewFile,
  children,
  ...rest
}: PropsWithChildren<FolderConnectorFormProps>) {
  if (!hasDirectory) return null;

  return (
    <div {...rest}>
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <div className="flex items-center justify-between border-b border-base-content/10 pb-2">
            <h2 className="card-title text-lg font-bold">
              📂 Directory Files
            </h2>
            <button
              onClick={refreshFiles}
              className="btn btn-sm btn-ghost btn-circle"
              title="Refresh files list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          {filesList.length === 0 ? (
            <p className="text-xs text-base-content/40 italic py-6 text-center">
              No files found. Try saving a simulated response!
            </p>
          ) : (
            <div className="mt-2 divide-y divide-base-content/5 max-h-80 overflow-y-auto pr-1">
              {filesList.map((fileName) => (
                <div
                  key={fileName}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <span className="truncate max-w-[150px] font-mono" title={fileName}>
                    {fileName}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreviewFile(fileName)}
                      className="btn btn-xs btn-ghost text-info"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {children}
        </div>
      </section>
    </div>
  );
}
