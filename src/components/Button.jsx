import React from 'react';

export function Button({
    children,
    variant = 'primary',
    className = '',
    disabled,
    ...props
}) {
    const variantClass = `btn-${variant}`;
    return (
        <button
            className={`btn ${variantClass} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
