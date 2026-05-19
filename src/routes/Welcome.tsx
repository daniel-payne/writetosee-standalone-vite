import { useState, useEffect } from 'react';
import { useLocalState } from '@keldan-systems/state-mutex';
import * as fileStorage from '../lib/fileStorage';
import NotificationDisplay from '../components/NotificationDisplay';
import LLMConector from '../components/LLMConector';
import FolderConnector from '../components/FolderConnector';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useSubmit, useActionData } from 'react-router-dom';

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
    <div {...rest} className={`h-full ${rest.className || ''}`}>
      <div className="h-full w-full flex flex-row justify-center items-center gap-2 flex-wrap">
        <NotificationDisplay errorMsg={errorMsg} successMsg={successMsg} />
        <LLMConector
          className="w-[360px] h-[280px]"
          apiKey={apiKey}
          savedKey={savedKey}
          setApiKey={setApiKey}
        />
        <FolderConnector
          className="w-[360px] h-[280px]"
          hasDirectory={hasDirectory}
          directoryName={directoryName}
          filesList={filesList}
        />
      </div>
    </div>

  );
};
