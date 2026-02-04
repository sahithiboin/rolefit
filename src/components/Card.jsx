import React from 'react';

export function Card({ children, className = '', glass = false, ...props }) {
    return (
        <div
            className={`card ${glass ? 'card-glass' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
