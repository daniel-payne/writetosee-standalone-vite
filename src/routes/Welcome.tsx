import { useState, useEffect } from 'react';
import SimpleConnector from '@/components/SimpleConnector';
import DisclaimerModal from '@/components/DisclaimerModal';
import NotificationDisplay from '@/components/NotificationDisplay';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useActionData, Link, useNavigate } from 'react-router-dom';
import { identifyApiKeyProvider } from '@/data/utilities/identifyApiKeyProvider';
import { wipeDatabase } from '@/data/storage/db';
import { clearProcessDb } from '@/data/process/db';

type WelcomeProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function Welcome({
  ...rest
}: PropsWithChildren<WelcomeProps>) {

  const loaderData = useLoaderData() as any;
  const actionData = useActionData() as any;
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      wipeDatabase(),
      clearProcessDb()
    ]).catch(err => {
      console.warn('Error clearing IndexedDB on Welcome mount:', err);
    });
  }, []);




  const [hasDirectory, setHasDirectory] = useState<boolean | undefined>(loaderData?.hasDirectory);
  const [permissionGranted, setPermissionGranted] = useState<boolean | undefined>(loaderData?.permissionGranted);
  // const [filesList, setFilesList] = useState<string[] | undefined>(loaderData?.filesList);
  const [directoryName, setDirectoryName] = useState<string | undefined>(loaderData?.directoryName);
  const [apiKey, setApiKey] = useState<string | undefined>(loaderData?.apiKey);
  const [savedKey, setSavedKey] = useState<string | undefined>(loaderData?.apiKey);

  const [errorMsg, setErrorMsg] = useState<string | undefined>(actionData?.errorMsg);
  const [successMsg, setSuccessMsg] = useState<string | undefined>(actionData?.successMsg);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('disclamer-accecpted') !== 'true';
    }
    return false;
  });

  const [prevLoaderData, setPrevLoaderData] = useState(loaderData);
  if (loaderData !== prevLoaderData) {
    setPrevLoaderData(loaderData);
    if (loaderData) {
      setHasDirectory(loaderData.hasDirectory);
      setPermissionGranted(loaderData.permissionGranted);
      // setFilesList(loaderData.filesList);
      setDirectoryName(loaderData.directoryName);
      setApiKey(loaderData.apiKey);
      setSavedKey(loaderData.apiKey);
    }
  }

  const [prevActionData, setPrevActionData] = useState(actionData);
  if (actionData !== prevActionData) {
    setPrevActionData(actionData);
    if (actionData) {
      if (actionData.success && actionData.message) {
        setSuccessMsg(actionData.message);
        setErrorMsg('');
      } else if (actionData.error) {
        setErrorMsg(actionData.error);
        setSuccessMsg('');
      }
    }
  }

  const apiKeyProvider = identifyApiKeyProvider(savedKey ?? '');
  const isApiKeyValid = apiKeyProvider === 'GOOGLE' || apiKeyProvider === 'XAI' || apiKeyProvider === 'OPENROUTER';
  const isStartDisabled = !hasDirectory || !permissionGranted || !isApiKeyValid;

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclamer-accecpted', 'true');
    setShowDisclaimer(false);
  };


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

        <SimpleConnector
          apiKey={apiKey ?? ''}
          setApiKey={setApiKey}
          hasDirectory={hasDirectory ?? false}
          directoryName={directoryName}
        />


        <a
          href={apiKey ? `/story?apiKey=${encodeURIComponent(apiKey)}` : '/story'}
          className={isStartDisabled ? 'pointer-events-none' : ''}
          tabIndex={isStartDisabled ? -1 : undefined}
          onClick={(e) => {
            if (isStartDisabled) return;
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
            navigate('/story');
          }}
        >
          <button className="btn btn-primary" disabled={isStartDisabled}>Start Creating Your Story</button>
        </a>
        <NotificationDisplay errorMsg={errorMsg} successMsg={successMsg} />
      </div>

      {showDisclaimer && (
        <DisclaimerModal onAccept={handleAcceptDisclaimer} />
      )}
    </div>
  );
}
