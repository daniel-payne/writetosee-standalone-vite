import { useEffect } from 'react';
import React from 'react';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLocation, useLoaderData, useNavigation, useRevalidator, useNavigate } from 'react-router-dom';
import type { MainLayoutLoaderData } from './MainLayout.loader';
import { useLocalState } from '@keldan-systems/state-mutex';
import { getDirectoryHandle, disconnectDirectory } from '@/data/storage/fileStorage';
import { wipeDatabase } from '@/data/storage/db';
import { loadStartup } from '@/data/process/loadStartup';
import { writeLog } from '@/data/storage/logStorage';
import { clearAllCaches } from '@/data/clearCaches';

type MainLayoutProps = {
} & HTMLAttributes<HTMLDivElement>;

const DEFAULT_THEME = 'pastel';
const DARK_THEME = 'dim';

const unselectedStyle = 'btn btn-sm btn-ghost rounded-xl';
const selectedStyle = 'btn btn-sm btn-primary bg-button hover:bg-button/80 bg-primary text-primary-content shadow-md shadow-primary/20 rounded-xl';
const disabledStyle = 'btn btn-sm btn-ghost btn-disabled pointer-events-none';

const debugUnselectedStyle = 'btn btn-sm btn-ghost rounded-xl opacity-65 hover:opacity-100 transition-opacity';
const debugSelectedStyle = 'btn btn-sm btn-primary bg-button hover:bg-button/80 bg-primary text-primary-content shadow-md shadow-primary/20 rounded-xl opacity-80 hover:opacity-100 transition-opacity';

// NavKeyLink: navigates cleanly (no apiKey) on regular click,
// but sets href with apiKey so right-click → "Open in new window/tab" passes the key.
function NavKeyLink({
  to,
  apiKey,
  navigate,
  className,
  tabIndex,
  'aria-disabled': ariaDisabled,
  children,
}: {
  to: string;
  apiKey: string;
  navigate: (to: string) => void;
  className?: string;
  tabIndex?: number;
  'aria-disabled'?: boolean;
  children: React.ReactNode;
}) {
  const href = apiKey ? `${to}?apiKey=${encodeURIComponent(apiKey)}` : to;
  return (
    <a
      href={href}
      className={className}
      tabIndex={tabIndex}
      aria-disabled={ariaDisabled}
      onClick={(e) => {
        if (ariaDisabled) {
          e.preventDefault();
          return;
        }
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // let browser handle new-tab gestures
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export default function MainLayout({
  children,
  ...rest
}: PropsWithChildren<MainLayoutProps>) {
  const loaderData = useLoaderData() as MainLayoutLoaderData;
  const location = useLocation();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [theme, setTheme] = useLocalState<string>('writetosee-theme', DEFAULT_THEME);
  const [columnsPerRow, setColumnsPerRow] = useLocalState<number>('writetosee-columns-per-row', 2);
  const [processingStatus] = useLocalState<boolean>('story-loading', false);
  const [imageProcessingStatus] = useLocalState<'idle' | 'processing'>('image-processing-status', 'idle');
  const [isDEBUG] = useLocalState<boolean>('isDEBUG', false);
  const [safeModeVal] = useLocalState<string | boolean>('safeMode', true);
  const isSafeMode = safeModeVal === true || safeModeVal === '1' || safeModeVal === 'true';

  useEffect(() => {
    if (loaderData?.hasDirectory && loaderData?.permissionGranted) {
      loadStartup().catch(async (err) => {
        await writeLog('error', 'MainLayout', `App startup load failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }, [loaderData?.hasDirectory, loaderData?.permissionGranted]);

  useEffect(() => {
    if (theme !== DEFAULT_THEME && theme !== DARK_THEME) {
      setTheme(DEFAULT_THEME);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, setTheme]);

  const toggleTheme = () => {
    setTheme(theme === DEFAULT_THEME ? DARK_THEME : DEFAULT_THEME);
  };

  const isActive = (path: string) => location.pathname === path;

  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const isProcessing = Boolean(processingStatus);
  const isStoryDisabled = !loaderData?.hasDirectory || !loaderData?.permissionGranted || !loaderData?.apiKey;
  const isNavDisabled = isStoryDisabled || isProcessing;

  const currentApiKey = loaderData?.apiKey || (typeof window !== 'undefined' ? window.sessionStorage.getItem("apiKey") : null) || '';

  const handleGrantPermission = async () => {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        revalidator.revalidate();
      }
    } catch (err) {
      await writeLog('error', 'MainLayout', `Failed to grant directory permission: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectDirectory();
      await wipeDatabase();
      clearAllCaches();
      navigate('/');
    } catch (err) {
      await writeLog('error', 'MainLayout', `Failed to disconnect directory: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  let styleLinkStyle = unselectedStyle;
  let storyLinkStyle = unselectedStyle;
  let charactersLinkStyle = unselectedStyle;
  let imagesLinkStyle = debugUnselectedStyle;
  let costsLinkStyle = debugUnselectedStyle;
  let logsLinkStyle = debugUnselectedStyle;
  let aboutLinkStyle = unselectedStyle;

  if (isActive('/style')) {
    styleLinkStyle = selectedStyle;
  }

  if (isActive('/story')) {
    storyLinkStyle = selectedStyle;
  }

  if (isActive('/characters')) {
    charactersLinkStyle = selectedStyle;
  }

  if (isActive('/images')) {
    imagesLinkStyle = debugSelectedStyle;
  }

  if (isActive('/costs')) {
    costsLinkStyle = debugSelectedStyle;
  }

  if (isActive('/logs')) {
    logsLinkStyle = debugSelectedStyle;
  }

  if (isActive('/about')) {
    aboutLinkStyle = selectedStyle;
  }

  if (isNavDisabled) {
    charactersLinkStyle = disabledStyle;
    imagesLinkStyle = disabledStyle;
    storyLinkStyle = disabledStyle;
    styleLinkStyle = disabledStyle;
    costsLinkStyle = disabledStyle;
    logsLinkStyle = disabledStyle;
    aboutLinkStyle = disabledStyle;
  }

  return (
    <div
      {...rest}
      className={`h-screen overflow-hidden bg-gradient-to-br from-base-300 via-base-100 to-base-200 text-base-content flex flex-col font-sans transition-all duration-300 ${rest.className || ''}`}
    >
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-base-100/70 border-b border-base-content/10 px-4 sm:px-8 py-3">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavKeyLink
              to="/"
              apiKey={currentApiKey}
              navigate={navigate}
              tabIndex={isNavDisabled ? -1 : undefined}
              aria-disabled={isNavDisabled}
              className={isNavDisabled ? 'pointer-events-none' : ''}
            >
              <div className={`p-2 bg-primary rounded-xl text-primary-content shadow-lg shadow-primary/30 ${isNavDisabled ? 'opacity-50' : 'animate-pulse'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 17.29a2.182 2.182 0 01-.504.34l-3.327 1.11a.488.488 0 01-.613-.613l1.11-3.328a2.182 2.182 0 01.34-.504l12.016-12.017zm0 0L19.5 7.125" />
                </svg>
              </div>
            </NavKeyLink>
            <div className="flex items-center">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                WriteToSee
              </span>
              {processingStatus && (
                <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse shadow-sm">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Story
                </span>
              )}
              {!processingStatus && imageProcessingStatus === 'processing' && (
                <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-secondary/15 text-secondary border border-secondary/20 animate-pulse shadow-sm">
                  <svg className="animate-spin h-3.5 w-3.5 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Images
                </span>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <NavKeyLink to="/story" apiKey={currentApiKey} navigate={navigate} className={storyLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Story</NavKeyLink>
            {!isSafeMode && <NavKeyLink to="/style" apiKey={currentApiKey} navigate={navigate} className={styleLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Style</NavKeyLink>}
            {!isSafeMode && <NavKeyLink to="/characters" apiKey={currentApiKey} navigate={navigate} className={charactersLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Characters</NavKeyLink>}

            {/* Debugging menu items: Images, Costs, Logs */}
            {!isSafeMode && isDEBUG && <NavKeyLink to="/images" apiKey={currentApiKey} navigate={navigate} className={imagesLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Images</NavKeyLink>}
            {!isSafeMode && isDEBUG && <NavKeyLink to="/costs" apiKey={currentApiKey} navigate={navigate} className={costsLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Costs</NavKeyLink>}
            {!isSafeMode && isDEBUG && <NavKeyLink to="/logs" apiKey={currentApiKey} navigate={navigate} className={logsLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>Logs</NavKeyLink>}
            <NavKeyLink to="/about" apiKey={currentApiKey} navigate={navigate} className={aboutLinkStyle} tabIndex={isNavDisabled ? -1 : undefined} aria-disabled={isNavDisabled}>About</NavKeyLink>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 w-full flex flex-col justify-center items-center">
        {loaderData?.hasDirectory && !loaderData?.permissionGranted ? (
          <div className="max-w-md w-full mx-auto p-8 rounded-2xl bg-base-100/60 backdrop-blur-lg border border-base-content/10 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-warning/10 rounded-2xl text-warning flex items-center justify-center mx-auto shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-base-content">
                Permission Required
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed">
                WriteToSee needs permission to access files in your connected directory:
              </p>
              <div className="p-3 bg-base-200/50 rounded-xl border border-base-content/5 font-mono text-xs text-primary font-bold break-all">
                {loaderData?.directoryName || "Local Directory"}
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleGrantPermission}
                className="btn btn-primary bg-primary text-primary-content shadow-lg shadow-primary/20 rounded-xl w-full"
              >
                Grant Access
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="btn btn-ghost text-error/80 hover:text-error hover:bg-error/10 rounded-xl w-full"
              >
                Disconnect Directory
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 mx-auto px-2 py-2 animate-fade-in flex flex-col min-h-0 overflow-y-auto">
            {children}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-base-content/10 bg-base-100/40 py-0 px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex justify-start items-center">
          <p className="text-xs text-base-content/60">© {new Date().getFullYear()} WriteToSee. Standalone Edition.</p>
        </div>

        <div className="flex-1 flex justify-center items-center min-h-[40px]">
          {isStoryDisabled ? (
            <div className="text-xs text-base-content/50">Save not available without an API Key and Local Directory Set</div>
          ) : (
            ['/style', '/story', '/panels', '/characters'].includes(location.pathname) && (
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  form="main-form"
                  name="intent"
                  value="CANCEL-UPDATES"
                  disabled={isSubmitting || isProcessing}
                  className="btn btn-sm btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="main-form"
                  name="intent"
                  value="SAVE-UPDATES"
                  disabled={isSubmitting || isProcessing}
                  className="btn btn-sm btn-success"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )
          )}
        </div>

        <div className="flex-1 flex justify-end items-center gap-2">
          {/* Card Width Selector Pill */}
          <div className="flex items-center gap-0.5 bg-base-content/10 backdrop-blur-md rounded-xl p-1 border border-base-content/10">
            {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setColumnsPerRow(n)}
                className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                  columnsPerRow === n
                    ? 'bg-base-content/25 text-base-content shadow-sm font-extrabold'
                    : 'text-base-content/50 hover:text-base-content hover:bg-base-content/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={toggleTheme}
            className="btn btn-sm btn-ghost gap-2 rounded-xl text-xs font-bold transition-all duration-300 hover:bg-base-content/10"
          >
            {theme === DEFAULT_THEME ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-warning">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-info animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
