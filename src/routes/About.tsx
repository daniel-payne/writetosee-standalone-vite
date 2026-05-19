import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLocalState } from '@keldan-systems/state-mutex';

type AboutProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function About({
  children,
  ...rest
}: PropsWithChildren<AboutProps>) {
  // Pull state-mutex values from the welcome page to demonstrate active sync!
  const [prompt] = useLocalState<string>('llm_prompt', 'N/A');
  const [markdownContent] = useLocalState<string>('llm_markdown', 'N/A');

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
            WriteToSee Standalone is a zero-dependency, locally distributed Single Page Application. It is built to operate directly from a static folder or locally served web directory, utilizing modern browser APIs to bypass standard backend requirements.
          </p>
        </div>
      </section>

      {/* State Mutex Sync Demo */}
      <section className="card bg-base-100 shadow-xl border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l-3 3m3-3l3 3" />
              </svg>
            </span>
            Real-Time State Mutex Sync
          </h2>
          <p className="text-sm text-base-content/60">
            Below is the current data pulled from the `@keldan-systems/state-mutex` store. If you open this app in another tab, change these values on the Welcome page, and return here, you will see them stay in perfect sync!
          </p>

          <div className="mt-6 space-y-4 p-4 rounded-xl bg-base-200 text-sm font-mono text-left">
            <div>
              <span className="font-bold text-primary block text-xs uppercase tracking-wider mb-1">Active LLM Prompt:</span>
              <p className="text-base-content/80 break-words">{prompt}</p>
            </div>
            <div className="border-t border-base-content/10 pt-4">
              <span className="font-bold text-secondary block text-xs uppercase tracking-wider mb-1">Active LLM Response Length:</span>
              <p className="text-base-content/80">{markdownContent.length} characters</p>
            </div>
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
      </section>
    </div>
  );
};
