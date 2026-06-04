import { type HTMLAttributes, type PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type LLMConnectorFormProps = {
  apiKey: string;
  setApiKey: (value: string) => void;
} & HTMLAttributes<HTMLDivElement>;

export default function LLMConnectorForm({
  apiKey,
  setApiKey,

  ...rest
}: PropsWithChildren<LLMConnectorFormProps>) {

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const value = e.target.value

    setApiKey(value)
  }

  return (
    <div {...rest} className={`form-control ${rest.className || ''}`}>
      <input
        type="text"
        value={apiKey}
        onChange={handleApiKeyChange}
        className="input input-bordered focus:input-primary w-full"
        placeholder="Enter your LLM API Key..."
      />
      <label className="gap-2 p-2 flex flex-col justify-start items-start">
        <div className="label-text-alt text-xs">
          Google Gemini : <Link
            to="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary-content"
          >
            https://aistudio.google.com/api-keys
          </Link>
          {/* <div className="label-text-alt text-xs">
            xAI Grok: <Link
              to="https://console.x.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary-content"
            >
              https://console.x.ai
            </Link>
          </div> */}
        </div>
      </label>

    </div>
  );
}
