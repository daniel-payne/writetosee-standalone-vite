import { useEffect, useState, type HTMLAttributes, type PropsWithChildren } from "react";
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

  const handleApiKeyChange = (e) => {

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
      <label className="label flex-wrap gap-2 ms-2">
        <span className="label-text-alt text-xs">
          Get a key: &nbsp;
          <Link
            to="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary-content"
          >
            https://aistudio.google.com/api-keys
          </Link>
        </span>
      </label>
    </div>
  );
}
