import { useState, type HTMLAttributes, type PropsWithChildren } from "react";
import { useLoaderData } from "react-router-dom";

type ImagesProps = {} & HTMLAttributes<HTMLDivElement>;

export default function Images({
  ...rest
}: PropsWithChildren<ImagesProps>) {
  const loaderData = useLoaderData() as any;
  const images = loaderData?.images || [];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleToggleExpand = (idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div {...rest} className={`p-6 w-full h-full overflow-auto flex flex-col ${rest.className || ''}`}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Image Storage</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Displaying {images.length} generated images in creation order. Double click any image to maximize.
          </p>
        </div>
        {expandedIdx !== null && (
          <button
            type="button"
            onClick={() => setExpandedIdx(null)}
            className="btn btn-sm btn-outline btn-primary rounded-xl"
          >
            Show Grid View
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400">No images found in storage.</p>
        </div>
      ) : (
        <div className={`w-full flex-1 min-h-0 ${expandedIdx !== null ? 'flex flex-col' : 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3 content-start'}`}>
          {images.map((image: any, idx: number) => {
            const isExpanded = expandedIdx === idx;
            if (expandedIdx !== null && !isExpanded) {
              return null;
            }

            return (
              <div
                key={image.name}
                onDoubleClick={() => handleToggleExpand(idx)}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${
                  isExpanded ? 'w-full h-full cursor-zoom-out' : 'w-full max-w-[500px] aspect-square mx-auto cursor-pointer hover:shadow-lg group'
                }`}
                title={isExpanded ? "Double click to make small" : "Double click to enlarge"}
              >
                <div className={`w-full relative flex items-center justify-center ${isExpanded ? 'w-full h-full bg-slate-950/20' : 'flex-1 min-h-0 bg-slate-100 dark:bg-slate-900 overflow-hidden'}`}>
                  <img
                    src={image.url}
                    alt={image.name}
                    className={`w-full h-full transition-transform duration-300 ${
                      isExpanded ? 'object-contain' : 'object-cover group-hover:scale-105'
                    }`}
                  />
                  {!isExpanded && image.paragraphNo && (
                    <span className="absolute top-3 left-3 badge badge-sm bg-slate-900/70 text-white border-none backdrop-blur-md shadow-md">
                      Picture {image.paragraphNo}
                    </span>
                  )}
                </div>

                {!isExpanded && (
                  <div className="p-3.5 h-28 shrink-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-col justify-between text-left">
                    {image.text ? (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium line-clamp-2">
                        {image.text}
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">
                        No text prompt associated
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100/50 dark:border-slate-700/50">
                      <span className="truncate max-w-[200px]" title={image.name}>
                        {image.name}
                      </span>
                      {image.lastModified && (
                        <span>
                          {new Date(image.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
