import React from 'react';

export const GlassCard = ({ children, className = "", ...props }) => (
    <div className={`backdrop-blur-xl bg-white/40 border border-white/30 shadow-xl rounded-[2.5rem] ${className}`} {...props}>
        {children}
    </div>
);
