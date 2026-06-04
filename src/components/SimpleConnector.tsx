import type { HTMLAttributes, PropsWithChildren } from "react";
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
      <div className="label-text-alt text-xs">
        Google Gemini Key : <Link
          to="https://aistudio.google.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary-content"
        >
          https://aistudio.google.com/api-keys
        </Link>
      </div>
      <input
        type="text"
        value={apiKey}
        onChange={handleOnChnge}
        className="input input-bordered focus:input-primary w-full"
        placeholder="Enter your LLM API Key..."
      />
      <div className="mt-4 label-text-alt text-xs">
        Select a local directory to save your story
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
    </div>
  );
}


