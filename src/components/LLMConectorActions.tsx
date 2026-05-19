import type { HTMLAttributes, PropsWithChildren } from "react";

type LLMConectorActionsProps = {
  apiKey: string;
  savedKey: string | null;
} & HTMLAttributes<HTMLDivElement>;

export default function LLMConectorActions({
  apiKey,
  savedKey,
  ...rest
}: PropsWithChildren<LLMConectorActionsProps>) {

  const handleDisconnectKey = () => {

  };

  const handleSelectKey = () => {

  };

  const canShow = apiKey?.length > 0 || savedKey?.length > 0
  const canSave = apiKey !== savedKey && apiKey?.length > 0

  if (canShow === false) {
    return null
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
