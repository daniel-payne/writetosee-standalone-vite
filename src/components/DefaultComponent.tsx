import type { HTMLAttributes, PropsWithChildren } from "react";

type ComponentProps = {
    // Add Props Here when making a copy to use

    name?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function DefaultComponent({
    // Also add Props here when making a copy

    name = 'DefaultComponent',
    children,
    ...rest
}: PropsWithChildren<ComponentProps>) {
    return (
        <div {...rest}
            data-name={name}
            style={{ border: "1px solid blue" }}
        >
            <h4>{name}</h4>

            {children}
        </div>
    );
}