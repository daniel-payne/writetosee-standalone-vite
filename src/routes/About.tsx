import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLocalState } from '@keldan-systems/state-mutex';
import { Link } from "react-router-dom";

type AboutProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function About({
  children,
  ...rest
}: PropsWithChildren<AboutProps>) {
  // Pull state-mutex values from the welcome page to demonstrate active sync!

  const [mutexVal, setMutexVal] = useLocalState<string>('image-generation-mutex', '');

  const [isDEBUG, setIsDEBUG] = useLocalState<boolean>('isDEBUG', false);
  const [safeModeVal, setSafeModeVal] = useLocalState<string | boolean>('safeMode', true);
  const isSafeMode = safeModeVal === true || safeModeVal === '1' || safeModeVal === 'true';

  return (
    <div {...rest} className={`max-w-3xl mx-auto space-y-8 ${rest.className || ''}`}>
      {children}
      {/* Introduction Card */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent inline-block">
            About WriteToSee Standalone
          </h1>
          <p className="mt-4 text-base-content/70 leading-relaxed">
            <span>WriteToSee Standalone is a zero-dependency, locally distributed Single Page Application. </span>
            <span>It is built to operate directly from a static folder or locally served web directory, utilizing modern browser APIs to bypass standard backend requirements.</span>
          </p>
        </div>
      </section>

      {/* Teacher Usage Card */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-16.25v16.25" />
              </svg>
            </span>
            Teacher Usage
          </h2>
          <div className="mt-4 text-base-content/70 leading-relaxed">
            <div className="mt-4">
              If you want to use this in a school, you can provide this lin to students, replacing YOUR_API_KEY with your own API key.
              This will cost you money, based on usage.
              DO NOT LEAVE KEYS ACTIVE OUTSIDE OF CLASS TIMES.
            </div>
            <div className="my-4">
              To start the application in simple mode, i.e. Story only, no character, style, panels, use this URL.
            </div>
            <code className="text-primary-content font-mono">https://writetosee.com/<strong>simple</strong>/?apiKey=YOUR_API_KEY</code>
            <div className="my-4">
              To start the application with all functionality, use this URL.
            </div>
            <code className="text-primary-content font-mono">https://writetosee.com/<strong>full</strong>/?apiKey=YOUR_API_KEY</code>
            <div className="my-4">
              You can email this a link to your students to use, it will automatically set the mode based on the URL.
            </div>
          </div>
        </div>
      </section>


      {/* Debugging Section */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-warning/10 rounded-lg text-warning">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </span>
            Debugging
          </h2>
          <p className="text-sm text-base-content/60">
            Display additional menu options for Images, Publication, Costs and Logs.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-row items-center gap-4">
              <input type="checkbox" checked={isDEBUG} className="checkbox" id="debugModeCheckbox" onChange={(e) => setIsDEBUG(e.target.checked)} />
              <label htmlFor="debugModeCheckbox" className="text-xs font-mono text-base-content/50 cursor-pointer select-none">
                Debug Mode: <span className={`font-bold ${isDEBUG ? 'text-error animate-pulse' : 'text-success'}`}>{isDEBUG ? 'ON' : 'OFF'}</span>
              </label>
            </div>

            <div className="flex flex-row items-center gap-4">
              <input type="checkbox" checked={isSafeMode} className="checkbox" id="simpleModeCheckbox" onChange={(e) => setSafeModeVal(e.target.checked)} />
              <label htmlFor="simpleModeCheckbox" className="text-xs font-mono text-base-content/50 cursor-pointer select-none">
                Simple Mode (Story only): <span className={`font-bold ${isSafeMode ? 'text-error animate-pulse' : 'text-success'}`}>{isSafeMode ? 'ON' : 'OFF'}</span>
              </label>
            </div>
          </div>
        </div>
      </section>


      {/* Troubleshooting Section */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-warning/10 rounded-lg text-warning">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            Troubleshooting
          </h2>
          <p className="text-sm text-base-content/60">
            If image generation gets stuck or is locked across tabs, you can clear the state mutex.
          </p>

          <div className="mt-4 flex flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => setMutexVal('')}
              className="btn btn-warning btn-sm font-semibold"
            >
              Clear Image Generation Lock
            </button>
            <span className="text-xs font-mono text-base-content/50">
              Lock status: <span className={`font-bold ${mutexVal ? 'text-error animate-pulse' : 'text-success'}`}>{mutexVal ? `LOCKED (${mutexVal})` : 'UNLOCKED'}</span>
            </span>
          </div>
        </div>
      </section>

      {/* How it Works / Technology Stack */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m11.142 0L21.75 12l-4.179-2.25M12 21.75V2.25" />
              </svg>
            </span>
            Technology Stack
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-base-100 border border-base-content/10">
              <h3 className="font-bold text-base-content">Tailwind CSS v4 & daisyUI v5</h3>
              <p className="text-xs text-base-content/60 mt-1">
                Modern utility styling paired with standard component classes, fully configured directly within CSS for simplified deployment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-base-100 border border-base-content/10">
              <h3 className="font-bold text-base-content">File System Access API</h3>
              <p className="text-xs text-base-content/60 mt-1">
                Enables reading and writing files directly to a designated local workspace directory without requiring a file upload dialog or backend API.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-base-100 border border-base-content/10">
              <h3 className="font-bold text-base-content">State Mutex Management</h3>
              <p className="text-xs text-base-content/60 mt-1">
                Bypasses full global stores (like Redux or Zustand) by linking state-locks directly to component levels and browser localStorage handles.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-base-100 border border-base-content/10">
              <h3 className="font-bold text-base-content">Folder Distribution Ready</h3>
              <p className="text-xs text-base-content/60 mt-1">
                Using relative paths (`base: './'`) and `HashRouter` ensures that launching `index.html` directly from a local folder routes perfectly.
              </p>
            </div>
          </div>
        </div>
        <div className="m-4 p-4 rounded-xl bg-base-100 border border-base-content/10">
          <p className="text-xs text-base-content/60 mt-1">
            This application was written by Keldan (Kellie and Daniel), we used to run a technology company called Keldan Systems Ltd.
            We developed several educational support software products, and provided consultancy.
            However due to UK tax changes, we decided to give up and close down our business and are offering this free of charge.
            It is a demonstration and proof of concept in the new world of agentic AI development using Google's antigravity.


          </p>
          <Link
            to="https://en.wikipedia.org/wiki/Tang_ping"
            className="text-xs text-primary-content/60 mt-1 no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tang Ping comes to the uk
          </Link>
        </div>
      </section >
    </div >
  );
};
