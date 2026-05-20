import type { HTMLAttributes, PropsWithChildren } from "react";
import { useFetcher } from "react-router-dom";

type LLMConectorActionsProps = {
  apiKey: string;
  savedKey: string | null;
} & HTMLAttributes<HTMLDivElement>;

export default function LLMConectorActions({
  apiKey,
  savedKey,
  ...rest
}: PropsWithChildren<LLMConectorActionsProps>) {

  const fetcher = useFetcher();

  const handleDisconnectKey = () => {
    fetcher.submit(
      { intent: 'CLEAR-APIKEY' },
      { method: 'post', action: '/' }
    );
  };

  const handleSelectKey = () => {
    fetcher.submit(
      { intent: 'SAVE-APIKEY', apiKey },
      { method: 'post', action: '/' }
    );
  };

  const canShow = (apiKey?.length ?? 0) > 0 || (savedKey?.length ?? 0) > 0
  const canSave = apiKey !== savedKey && (apiKey?.length ?? 0) > 0

  if (canShow === false) {
    return (<div {...rest} className={`space-y-2 ${rest.className || ''}`}><button
      type="button"
      className="btn btn-primary btn-sm w-full btn-disabled"
      disabled
    >
      Save API Key
    </button></div>)
  }

  return (
    <div {...rest} className={`space-y-2 ${rest.className || ''}`}>

      {canSave === false ? (

        <button
          type="button"
          onClick={handleDisconnectKey}
          className="btn btn-outline btn-error btn-sm w-full"
        >
          Forget API Key
        </button>

      ) : (

        <button
          type="button"
          onClick={handleSelectKey}
          className="btn btn-primary btn-sm w-full"
        >
          Save API Key
        </button>

      )}

    </div>
  );
}
