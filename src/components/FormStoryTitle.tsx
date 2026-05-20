import type { HTMLAttributes, PropsWithChildren } from "react";
import React from 'react';

type ComponentProps = {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function FormStoryTitle({
    value,
    onChange,
    name = 'FormStoryTitle',
    ...rest
}: PropsWithChildren<ComponentProps>) {
    return (
        <div {...rest} data-name={name}>
            <div className="flex flex-col gap-6">
                <div>
                    <label htmlFor="storyTitle" className="ps-4 block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Story Title</label>
                    <input
                        type="text"
                        name="storyTitle"
                        id="storyTitle"
                        value={value}
                        onChange={onChange}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-slate-700 dark:text-white"
                    />
                </div>
            </div>
        </div>
    );
}
