import { useEffect } from 'react';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { Link, useLocation, useLoaderData, useNavigation, useRevalidator, useNavigate } from 'react-router-dom';
import type { MainLayoutLoaderData } from './MainLayout.loader';
import { useLocalState } from '@keldan-systems/state-mutex';
import { getDirectoryHandle, disconnectDirectory } from '@/data/storage/fileStorage';

type MainLayoutProps = {
} & HTMLAttributes<HTMLDivElement>;

const DEFAULT_THEME = 'pastel';
const DARK_THEME = 'dim';

const unselectedStyle = 'btn btn-sm btn-ghost rounded-xl';
const selectedStyle = 'btn btn-sm btn-primary bg-button hover:bg-button/80 bg-primary text-primary-content shadow-md shadow-primary/20 rounded-xl';
const disabledStyle = 'btn btn-sm btn-ghost btn-disabled pointer-events-none';

export default function MainLayout({
  children,
  ...rest
}: PropsWithChildren<MainLayoutProps>) {
  const location = useLocation();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [theme, setTheme] = useLocalState<string>('writetosee-theme', DEFAULT_THEME);

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

  const loaderData = useLoaderData() as MainLayoutLoaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const isStoryDisabled = !loaderData?.hasDirectory || !loaderData?.permissionGranted || !loaderData?.apiKey;

  const handleGrantPermission = async () => {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        revalidator.revalidate();
      }
    } catch (err) {
      console.error("Failed to grant directory permission:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectDirectory();
      navigate('/');
    } catch (err) {
      console.error("Failed to disconnect directory:", err);
    }
  };


  let styleLinkStyle = unselectedStyle
  let storyLinkStyle = unselectedStyle;
  let panelsLinkStyle = unselectedStyle;
  let charactersLinkStyle = unselectedStyle;
  let imagesLinkStyle = unselectedStyle;
  let publicationLinkStyle = unselectedStyle;
  let costsLinkStyle = unselectedStyle;
  let logsLinkStyle = unselectedStyle;
  let aboutLinkStyle = unselectedStyle;

  if (isActive('/style')) {
    styleLinkStyle = selectedStyle;
  }

  if (isActive('/story')) {
    storyLinkStyle = selectedStyle;
  }

  if (isActive('/panels')) {
    panelsLinkStyle = selectedStyle;
  }

  if (isActive('/characters')) {
    charactersLinkStyle = selectedStyle;
  }

  if (isActive('/images')) {
    imagesLinkStyle = selectedStyle;
  }

  if (isActive('/publication')) {
    publicationLinkStyle = selectedStyle;
  }

  if (isActive('/costs')) {
    costsLinkStyle = selectedStyle;
  }

  if (isActive('/logs')) {
    logsLinkStyle = selectedStyle;
  }

  if (isActive('/about')) {
    aboutLinkStyle = selectedStyle;
  }

  if (isStoryDisabled) {
    panelsLinkStyle = disabledStyle;
    charactersLinkStyle = disabledStyle;
    imagesLinkStyle = disabledStyle;
    storyLinkStyle = disabledStyle;
    styleLinkStyle = disabledStyle;
    publicationLinkStyle = disabledStyle;
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
            <Link
              to="/"
              tabIndex={isStoryDisabled ? -1 : undefined}
              aria-disabled={isStoryDisabled}
              className={isStoryDisabled ? 'pointer-events-none' : ''}
            >
              <div className={`p-2 bg-primary rounded-xl text-primary-content shadow-lg shadow-primary/30 ${isStoryDisabled ? 'opacity-50' : 'animate-pulse'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 17.29a2.182 2.182 0 01-.504.34l-3.327 1.11a.488.488 0 01-.613-.613l1.11-3.328a2.182 2.182 0 01.34-.504l12.016-12.017zm0 0L19.5 7.125" />
                </svg>
              </div>
            </Link>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                WriteToSee
              </span>
              {/* <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                Standalone
              </span> */}
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {/* <Link to="/" className={welcomeLinkStyle} >Welcome</Link> */}
            <Link to="/story" className={storyLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Story</Link>
            {!loaderData?.safeMode && <Link to="/panels" className={panelsLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Panels</Link>}
            {!loaderData?.safeMode && <Link to="/characters" className={charactersLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Characters</Link>}
            {!loaderData?.safeMode && <Link to="/images" className={imagesLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Images</Link>}
            {!loaderData?.safeMode && <Link to="/publication" className={publicationLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Publication</Link>}
            {!loaderData?.safeMode && <Link to="/style" className={styleLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Style</Link>}
            {!loaderData?.safeMode && <Link to="/costs" className={costsLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Costs</Link>}
            {!loaderData?.safeMode && <Link to="/logs" className={logsLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>Logs</Link>}
            <Link to="/about" className={aboutLinkStyle} tabIndex={isStoryDisabled ? -1 : undefined} aria-disabled={isStoryDisabled}>About</Link>
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
            <div className="text-xs text-base-content/50">Save not available without a API Key and Local Directory Set</div>
          ) : (
            ['/style', '/story', '/panels', '/characters'].includes(location.pathname) && (
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  form="main-form"
                  name="intent"
                  value="CANCEL-UPDATES"
                  disabled={isSubmitting}
                  className="btn btn-sm btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="main-form"
                  name="intent"
                  value="SAVE-UPDATES"
                  disabled={isSubmitting}
                  className="btn btn-sm btn-success"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )
          )}


        </div>

        <div className="flex-1 flex justify-end items-center">
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
