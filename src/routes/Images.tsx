import type { HTMLAttributes, PropsWithChildren } from "react";
import { useLoaderData } from "react-router-dom";

type ImagesProps = {} & HTMLAttributes<HTMLDivElement>;

// blob:http://localhost:5173/a7ed5972-67d7-4d2c-be64-1ae50115fdcd
// https://i.pinimg.com/474x/34/d3/0d/34d30dad987dc4bc1a8f7275b3a178e8.jpg

export default function Images({
  children,
  ...rest
}: PropsWithChildren<ImagesProps>) {
  const loaderData = useLoaderData() as any;
  const images = loaderData?.images || [];

  return (
    <div {...rest} className={`p-6 w-full h-full overflow-auto ${rest.className || ''}`}>
      <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Image Storage</h1>

      {images.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400">No images found in storage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {images.map((image: any) => (
            <div key={image.name} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className="aspect-square w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2 relative">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={image.name}>
                  {image.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
