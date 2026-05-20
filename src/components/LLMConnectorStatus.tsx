import type { HTMLAttributes, PropsWithChildren } from "react";

type LLMStatusProps = {
  hasKey: boolean;
} & HTMLAttributes<HTMLDivElement>;

export default function LLMConnectorStatus({
  hasKey,
  ...rest
}: PropsWithChildren<LLMStatusProps>) {
  return (
    <div {...rest} >
      <div>
        <span className="font-semibold me-2">Status:</span>
        {hasKey ? (
          <span className="badge badge-success gap-1">
            LLM Connected
          </span>
        ) : (
          <span className="badge badge-warning gap-1">
            Not Connected
          </span>
        )}
      </div>
    </div>
  );
}
