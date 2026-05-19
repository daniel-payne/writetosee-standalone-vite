import { useState, type HTMLAttributes, type PropsWithChildren } from "react";

import LLMConnectorHeader from "./LLMConnectorHeader";
import LLMConnectorStatus from "./LLMConnectorStatus";
import LLMConectorActions from "./LLMConectorActions";
import LLMConnectorForm from "./LLMConnectorForm";

type LLMConectorProps = {
  name?: string;
  apiKey?: string | null;
  savedKey: string | null;
  setApiKey?: any;
} & HTMLAttributes<HTMLDivElement>;

export default function LLMConector({
  name = "LLMConector",
  apiKey,
  savedKey,
  setApiKey,
  ...rest
}: PropsWithChildren<LLMConectorProps>) {
  return (
    <div {...rest} data-name={name}  >
      <div className="h-full w-full card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-title p-4">
          <LLMConnectorHeader className="card-title text-xl font-bold flex items-center gap-2" />
        </div>
        <div className="card-body">
          <LLMConnectorStatus hasKey={apiKey?.length > 0} />
          <LLMConnectorForm apiKey={apiKey} setApiKey={setApiKey} />
        </div>
        <div className="card-actions p-2">
          <LLMConectorActions
            className="w-full p-4"
            apiKey={apiKey}
            savedKey={savedKey}
          />
        </div>
      </div>
    </div>
  );
}
