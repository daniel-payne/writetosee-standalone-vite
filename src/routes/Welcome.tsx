import { useState, useEffect } from 'react';
import SimpleConnector from '@/components/SimpleConnector';
import DisclaimerModal from '@/components/DisclaimerModal';
import NotificationDisplay from '@/components/NotificationDisplay';
import LLMConector from '@/components/LLMConector';
import FolderConnector from '@/components/FolderConnector';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData, Link } from 'react-router-dom';



type WelcomeProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function Welcome({
  children,
  ...rest
}: PropsWithChildren<WelcomeProps>) {

  const loaderData = useLoaderData() as any;
  const actionData = useActionData() as any;

  const [hasDirectory, setHasDirectory] = useState<boolean | undefined>(loaderData?.hasDirectory);
  const [filesList, setFilesList] = useState<string[] | undefined>(loaderData?.filesList);
  const [directoryName, setDirectoryName] = useState<string | undefined>(loaderData?.directoryName);
  const [apiKey, setApiKey] = useState<string | undefined>(loaderData?.apiKey);
  const [savedKey, setSavedKey] = useState<string | undefined>(loaderData?.apiKey);

  const [errorMsg, setErrorMsg] = useState<string | undefined>(actionData?.errorMsg);
  const [successMsg, setSuccessMsg] = useState<string | undefined>(actionData?.successMsg);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);

  const isStartDisabled = hasDirectory === false || !((savedKey?.length ?? 0) > 0);

  useEffect(() => {
    const accepted = localStorage.getItem('disclamer-accecpted');
    if (accepted !== 'true') {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclamer-accecpted', 'true');
    setShowDisclaimer(false);
  };

  useEffect(() => {
    if (loaderData) {
      setHasDirectory(loaderData.hasDirectory)
      setFilesList(loaderData.filesList)
      setDirectoryName(loaderData.directoryName)
      setApiKey(loaderData.apiKey)
      setSavedKey(loaderData.apiKey)
    }
  }, [loaderData]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success && actionData.message) {
        setSuccessMsg(actionData.message);
        setErrorMsg('');
      } else if (actionData.error) {
        setErrorMsg(actionData.error);
        setSuccessMsg('');
      }
    }
  }, [actionData]);


  return (
    <div
      {...rest}
      className={`h-full bg-cover bg-center ${rest.className || ''}`}
      style={{ backgroundImage: "url('/welcome-background.jpg')" }}
    >
      <div className="h-full w-full flex flex-col justify-center items-center gap-6 pt-0 pb-4 text-center">
        <div className="animate-fade-in  ">
          <h1 className="text-5xl md:text-6xl font-bold text-primary ">
            WriteToSee
          </h1>
          <h4 className="text-secondary text-xs">
            Video Intorduction: &nbsp;
            <Link
              to="https://www.youtube.com/watch?v=NbQ5YgtjyLs"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary-content"
            >
              https://www.youtube.com/
            </Link>
          </h4>
        </div>
        {loaderData?.safeMode ? (
          <SimpleConnector
            apiKey={apiKey ?? ''}
            setApiKey={setApiKey}
            hasDirectory={hasDirectory ?? false}
          />
        ) : (
          <div className="flex flex-row justify-center items-center gap-6 flex-wrap">
            <LLMConector
              className="w-[360px] h-[280px]"
              apiKey={apiKey ?? ''}
              savedKey={savedKey ?? null}
              setApiKey={setApiKey}
            />
            <FolderConnector
              className="w-[360px] h-[280px]"
              hasDirectory={hasDirectory ?? false}
              directoryName={directoryName}
              filesList={filesList ?? []}
            />
          </div>
        )}

        <Link to="/story" className={isStartDisabled ? "pointer-events-none" : ""} tabIndex={isStartDisabled ? -1 : undefined}>
          <button className="btn btn-primary" disabled={isStartDisabled}>Start Creating Your Story</button>
        </Link>
        <NotificationDisplay errorMsg={errorMsg} successMsg={successMsg} />
      </div>

      {showDisclaimer && (
        <DisclaimerModal onAccept={handleAcceptDisclaimer} />
      )}
    </div>
  );
}
