import type { HTMLAttributes, PropsWithChildren } from "react";

type NotificationDisplayProps = {
  errorMsg?: string | null;
  successMsg?: string | null;
} & HTMLAttributes<HTMLDivElement>;

export default function NotificationDisplay({
  errorMsg,
  successMsg,
  children,
  ...rest
}: PropsWithChildren<NotificationDisplayProps>) {
  if (!errorMsg && !successMsg) return null;

  return (
    <div {...rest} className={`lg:col-span-3 ${rest.className || ''}`}>
      {errorMsg && (
        <div className="alert alert-error shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success shadow-lg mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
};
