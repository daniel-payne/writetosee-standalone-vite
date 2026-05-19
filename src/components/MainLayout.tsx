import { useEffect } from 'react';
import type { HTMLAttributes, PropsWithChildren } from "react";
import { Link, useLocation } from 'react-router-dom';
import { useLocalState } from '@keldan-systems/state-mutex';

type MainLayoutProps = {
} & HTMLAttributes<HTMLDivElement>;

export default function MainLayout({
  children,
  ...rest
}: PropsWithChildren<MainLayoutProps>) {
  const location = useLocation();
  const [theme, setTheme] = useLocalState<string>('writetosee-theme', 'pastel');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'pastel' ? 'night' : 'pastel');
  };

  const isActive = (path: string) => location.pathname === path;

  const isStoryDisabled = true;

  return (
    <div
      {...rest}
      className={`h-screen overflow-hidden bg-gradient-to-br from-base-300 via-base-100 to-base-200 text-base-content flex flex-col font-sans transition-all duration-300 ${rest.className || ''}`}
    >
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-base-100/70 border-b border-base-content/10 px-4 sm:px-8 py-3">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-primary-content shadow-lg shadow-primary/30 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795H14.19l.818-5.096L6 15.904h3.813z" />
              </svg>
            </div>
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
            <Link
              to="/"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive('/')
                ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
                : 'hover:bg-base-content/10'
                }`}
            >
              Welcome
            </Link>

            <Link
              to="/story"
              className={`btn btn-ghost rounded-xl ${isStoryDisabled ? 'btn-disabled pointer-events-none' : ''}`}
              tabIndex={isStoryDisabled ? -1 : undefined}
              aria-disabled={isStoryDisabled}
            >
              Story
            </Link>
            <Link
              to="/panels"
              className={`btn btn-ghost rounded-xl ${isStoryDisabled ? 'btn-disabled pointer-events-none' : ''}`}
              tabIndex={isStoryDisabled ? -1 : undefined}
              aria-disabled={isStoryDisabled}
            >
              Panels
            </Link>
            <Link
              to="/characters"
              className={`btn btn-ghost rounded-xl ${isStoryDisabled ? 'btn-disabled pointer-events-none' : ''}`}
              tabIndex={isStoryDisabled ? -1 : undefined}
              aria-disabled={isStoryDisabled}
            >
              Characters
            </Link>
            <Link
              to="/images"
              className={`btn btn-ghost rounded-xl ${isStoryDisabled ? 'btn-disabled pointer-events-none' : ''}`}
              tabIndex={isStoryDisabled ? -1 : undefined}
              aria-disabled={isStoryDisabled}
            >
              Images
            </Link>
            <Link
              to="/about"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive('/about')
                ? 'btn btn-primary text-primary-content shadow-md shadow-primary/20'
                : 'btn btn-ghost'
                }`}
            >
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col">
        <div className="w-full flex-1 mx-auto px-2 py-2 animate-fade-in flex flex-col">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-base-content/10 bg-base-100/40 py-1 text-center text-xs text-base-content/60">
        <div className="mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} WriteToSee. Standalone Edition.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={toggleTheme}
              className="btn btn-sm btn-ghost gap-2 rounded-xl text-xs font-bold transition-all duration-300 hover:bg-base-content/10"
            >
              {theme === 'pastel' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-warning">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  {/* <span>Pastel Theme</span> */}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-info animate-pulse">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  {/* <span>Night Theme</span> */}
                </>
              )}
            </button>
            {/* <div className="h-4 w-[1px] bg-base-content/20 hidden sm:block"></div>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              Local State Enabled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-info"></span>
              FS Access Active
            </span> */}
          </div>
        </div>
      </footer>
    </div>
  );
};
