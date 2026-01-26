"use client";
import React, { useEffect, useState } from 'react';

const NoSSR = ({ children }: { children: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <div className="animate-pulse">Loading System...</div>
            </div>
        );
    }

    return <>{children}</>;
};

export default NoSSR;
