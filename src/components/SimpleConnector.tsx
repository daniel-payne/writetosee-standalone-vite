import type { HTMLAttributes, PropsWithChildren } from "react";
import { useFetcher } from "react-router-dom";

type SimpleConnectorProps = {
  apiKey: string;
  setApiKey: (val: string) => void;
  hasDirectory: boolean;
} & HTMLAttributes<HTMLDivElement>;

export default function SimpleConnector({
  apiKey,
  setApiKey,
  hasDirectory,
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
    <div {...rest} className={`flex flex-col gap-2 w-[360px] ${rest.className || ''}`}>
      <input
        type="text"
        value={apiKey}
        onChange={handleOnChnge}
        className="input input-bordered focus:input-primary w-full"
        placeholder="Enter your LLM API Key..."
      />
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
          className="btn btn-primary btn-sm w-full"
        >
          Select Local Directory
        </button>
      )}
    </div>
  );
}
