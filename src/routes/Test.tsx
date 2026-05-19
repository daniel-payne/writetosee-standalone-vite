import { useState, useEffect } from 'react';
import { useLocalState } from '@keldan-systems/state-mutex';
import * as fileStorage from '../lib/fileStorage';
import NotificationDisplay from '../components/NotificationDisplay';
import LLMConector from '../components/LLMConector';
import FolderConnector from '../components/FolderConnector';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData, useSubmit, useActionData } from 'react-router-dom';

type TestProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function Test({
  children,
  ...rest
}: PropsWithChildren<TestProps>) {
  // state-mutex hooks for persistent state
  const [prompt, setPrompt] = useLocalState<string>('llm_prompt', 'Write a short story about an astronaut looking back at Earth.');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const loaderData = useLoaderData() as any;
  const actionData = useActionData() as any;
  const submit = useSubmit();

  // UI Local states (non-persistent between refreshes or tab-isolated)
  const [hasDirectory, setHasDirectory] = useState<boolean>(loaderData?.hasDirectory ?? false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [filesList, setFilesList] = useState<string[]>(loaderData?.filesList ?? []);
  const [filePreview, setFilePreview] = useState<{ name: string; content: string } | null>(null);

  useEffect(() => {
    setHasDirectory(loaderData?.hasDirectory ?? false);
    setFilesList(loaderData?.filesList ?? []);
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

  const handleSelectDirectory = () => {
    setErrorMsg('');
    setSuccessMsg('');
    submit({ intent: 'select-directory' }, { method: 'post' });
  };

  const handleDisconnectDirectory = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fileStorage.disconnectDirectory();
      setHasDirectory(false);
      setFilesList([]);
      setFilePreview(null);
      setSuccessMsg('Disconnected from directory.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect.');
    }
  };

  const refreshFiles = async () => {
    setErrorMsg('');
    try {
      const files = await fileStorage.listFiles();
      setFilesList(files);
    } catch (err: any) {
      setErrorMsg(`Could not read files: ${err.message}. Please authorize permission.`);
    }
  };

  const handleSaveMarkdown = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!hasDirectory) {
      setErrorMsg('Please select a local directory first.');
      return;
    }
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `story-${timestamp}.md`;
      await fileStorage.writeFile(filename, markdownContent);
      setSuccessMsg(`Saved file: ${filename}`);
      await refreshFiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save markdown file.');
    }
  };

  const handleSaveRandomImage = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!hasDirectory) {
      setErrorMsg('Please select a local directory first.');
      return;
    }
    try {
      // Create a canvas to generate a png
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // Draw random interesting visual (space theme matching default prompt)
      const grad = ctx.createRadialGradient(200, 200, 50, 200, 200, 200);
      grad.addColorStop(0, '#3b82f6'); // primary
      grad.addColorStop(0.5, '#8b5cf6'); // secondary
      grad.addColorStop(1, '#0f172a'); // slate-900
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 400;
        const r = Math.random() * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Earth-like sphere
      ctx.beginPath();
      ctx.arc(200, 200, 80, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#60a5fa';
      ctx.stroke();

      // Convert to blob and save
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setErrorMsg('Failed to generate image blob');
          return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `image-${timestamp}.png`;
        try {
          await fileStorage.writeFile(filename, blob);
          setSuccessMsg(`Saved image: ${filename}`);
          await refreshFiles();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to save image file.');
        }
      }, 'image/png');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate image.');
    }
  };

  const handlePreviewFile = async (name: string) => {
    setErrorMsg('');
    try {
      const file = await fileStorage.readFile(name);
      if (name.endsWith('.md') || name.endsWith('.txt')) {
        const text = await file.text();
        setFilePreview({ name, content: text });
      } else {
        setFilePreview({ name, content: `Binary file of type: ${file.type} (${(file.size / 1024).toFixed(1)} KB)` });
      }
    } catch (err: any) {
      setErrorMsg(`Failed to open file preview: ${err.message}`);
    }
  };

  return (
    <div {...rest} className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${rest.className || ''}`}>
      {children}
      {/* Notifications */}
      <NotificationDisplay errorMsg={errorMsg} successMsg={successMsg} />

      {/* Column 1 & 2: Main app operations */}
      <div className="lg:col-span-2 space-y-8">
        {/* State Mutex Form */}
        <LLMConector
          prompt={prompt}
          setPrompt={setPrompt}
          markdownContent={markdownContent}
          setMarkdownContent={setMarkdownContent}
          handleSaveMarkdown={handleSaveMarkdown}
          handleSaveRandomImage={handleSaveRandomImage}
          hasDirectory={hasDirectory}
        />

        {/* File Preview */}
        {filePreview && (
          <section className="card bg-base-100 shadow-xl border border-base-content/5">
            <div className="card-body">
              <div className="flex items-center justify-between border-b border-base-content/10 pb-2">
                <h2 className="card-title text-lg font-bold truncate">
                  📄 Previewing: {filePreview.name}
                </h2>
                <button
                  onClick={() => setFilePreview(null)}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  ✕
                </button>
              </div>
              <pre className="mt-4 p-4 rounded-lg bg-base-200 text-sm overflow-x-auto whitespace-pre-wrap font-mono text-left max-h-80 overflow-y-auto">
                {filePreview.content}
              </pre>
            </div>
          </section>
        )}
      </div>

      {/* Column 3: Directory Actions & File browser */}
      <FolderConnector
        hasDirectory={hasDirectory}
        handleDisconnectDirectory={handleDisconnectDirectory}
        handleSelectDirectory={handleSelectDirectory}
        refreshFiles={refreshFiles}
        filesList={filesList}
        handlePreviewFile={handlePreviewFile}
      />
    </div>
  );
};
