import React from 'react';

export function Input({ className = '', ...props }) {
    return (
        <input
            className={`input-base ${className}`}
            {...props}
        />
    );
}

export function Textarea({ className = '', ...props }) {
    return (
        <textarea
            className={`input-base ${className}`}
            style={{ height: 'auto', minHeight: '100px', paddingTop: '16px' }}
            {...props}
        />
    );
}
