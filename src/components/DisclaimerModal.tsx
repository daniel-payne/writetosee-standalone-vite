import type { HTMLAttributes, PropsWithChildren } from "react";

type DisclaimerModalProps = {
  /** Callback when the user accepts the disclaimer */
  onAccept: () => void;
} & HTMLAttributes<HTMLDivElement>;

export default function DisclaimerModal({
  onAccept,
  children,
  ...rest
}: PropsWithChildren<DisclaimerModalProps>) {
  return (
    <div className="modal modal-open" {...rest}>
      <div className="modal-box max-w-2xl bg-base-100 border border-base-content/10 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left">
        <h3 className="font-extrabold text-xl text-primary flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-warning">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Important Disclaimer
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Welcome to <strong>WriteToSee</strong>. This application uses Artificial Intelligence (AI) to assist in generating stories, character profiles, drawing instructions, and visual artwork.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed  ">
          There is no <strong>GDPR/CPRA</strong> or any privacy policy to accecpt, there are no cookies, no personal information collected.
          <br />
          Your data is local to your machine, and it is up to you to secure your Api Keys.
          <br />
          <strong>Costs are your responsibility</strong>, image generation can easily run up high bills if not careful.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Please note that AI-generated content can occasionally contain errors, bias, or unexpected results.
          By continuing, you agree that you understand this limitation and take full responsibility for reviewing and verifying the output.
        </p>
        <p className="text-sm text-primary-content leading-relaxed font-bold">
          We are in development, and not everything is working as expected yet.
          <br />
          By continuing, you agree to use the application at your own risk.
        </p>
        <div className="modal-action mt-2">
          <button
            type="button"
            onClick={onAccept}
            className="btn btn-primary w-full"
          >
            I Accept &amp; Understand
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-sm"></div>
    </div>
  );
}
