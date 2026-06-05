import { useState, type HTMLAttributes, type PropsWithChildren } from "react";
import { Link, useFetcher } from "react-router-dom";

type SimpleConnectorProps = {
  apiKey: string;
  setApiKey: (val: string) => void;
  hasDirectory: boolean;
  directoryName?: string | null;
} & HTMLAttributes<HTMLDivElement>;

export default function SimpleConnector({
  apiKey,
  setApiKey: _setApiKey,
  hasDirectory,
  directoryName,
  ...rest
}: PropsWithChildren<SimpleConnectorProps>) {
  const fetcher = useFetcher();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDirInfoModalOpen, setIsDirInfoModalOpen] = useState(false);

  const handleDisconnectDirectory = () => {
    fetcher.submit(
      { intent: 'DISCONNECT-DIRECTORY' },
      { method: 'post', action: '/' }
    );
  };

  const handleSelectDirectory = () => {
    fetcher.submit(
      { intent: 'SELECT-DIRECTORY' },
      { method: 'post', action: '/' }
    );
  };


  const handleOnChnge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;

    if (apiKey.length === 0) {
      fetcher.submit(
        { intent: 'CLEAR-APIKEY' },
        { method: 'post', action: '/' }
      );
    } else {
      fetcher.submit(
        { intent: 'SAVE-APIKEY', apiKey: e.target.value },
        { method: 'post', action: '/' }
      );
    }
  };

  return (
    <div {...rest} className={`border border-base-content/20 shadow-md rounded-md p-6 flex flex-col gap-2 w-[360px] ${rest.className || ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-base-content/70 text-left">
          Enter your Google or xAI API Key
        </label>
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          className="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-primary hover:bg-base-content/10 flex items-center justify-center"
          title="Get API Key links"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="w-4 h-4 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
      <input
        type="text"
        value={apiKey}
        onChange={handleOnChnge}
        className="input input-bordered focus:input-primary w-full"
        placeholder="Enter your LLM API Key..."
      />
      <div className="mt-4 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-base-content/70 text-left">
          Select a local directory to save your story
        </label>
        <button
          type="button"
          onClick={() => setIsDirInfoModalOpen(true)}
          className="btn btn-circle btn-ghost btn-xs text-base-content/60 hover:text-primary hover:bg-base-content/10 flex items-center justify-center"
          title="About local folder storage"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="w-4 h-4 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
      {hasDirectory ? (
        <button
          onClick={handleDisconnectDirectory}
          className="btn btn-outline btn-error btn-sm w-full"
        >
          <span className="text-sm font-light">Disconnect Directory :</span>{directoryName}
        </button>
      ) : (
        <button
          onClick={handleSelectDirectory}
          className="btn btn-primary btn-sm w-full"
        >
          Select Local Directory
        </button>
      )}

      {isInfoModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left">
            <h3 className="text-primary-content font-bold text-lg text-base-content">Get an API Key</h3>
            <p className="text-sm text-base-content/80">Currently we only support image generation with an API Key. This is needed for the system to generate the story images.</p>
            <p className="text-sm text-base-content/80">In future we will support SSO authentication for a LLM subscription service and expand out range of image providers.</p>
            <p className="text-sm text-base-content/80">You can get an API key from the following sources:</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-base-content/60">Google Gemini Key:</span>
                <Link
                  to="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link text-info-content text-sm break-all"
                >
                  https://aistudio.google.com/api-keys
                </Link>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-base-content/60">xAI Grok Key:</span>
                <Link
                  to="https://console.x.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link text-info-content text-sm break-all"
                >
                  https://console.x.ai
                </Link>
              </div>
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setIsInfoModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
            onClick={() => setIsInfoModalOpen(false)}
          ></div>
        </div>
      )}

      {isDirInfoModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left">
            <h3 className="text-primary-content font-bold text-lg text-base-content">Local Directory Storage</h3>
            <div className="text-sm text-base-content/80 flex flex-col gap-3">
              <p>
                To run WriteToSee, you must connect a local folder on your computer.
              </p>
              <p>
                All your story files (text structure, chapters, and prompts) as well as the generated images will be saved directly inside this local folder.
              </p>
              <p>
                This ensures you have complete ownership and offline access to all your creative assets.
              </p>
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setIsDirInfoModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/40 backdrop-blur-sm"
            onClick={() => setIsDirInfoModalOpen(false)}
          ></div>
        </div>
      )}
    </div>
  );
}


