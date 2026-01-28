"use client";

import { useState } from "react";
import { ChevronDown, Building2, Home } from "lucide-react";

export default function TenantSwitcher() {
    const [activeTenant, setActiveTenant] = useState("Beast Mode Contracting");

    const tenants = [
        { name: "Beast Mode Contracting", type: "Home Services", icon: Building2 },
        { name: "Homexx", type: "Real Estate", icon: Home },
    ];

    return (
        <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {activeTenant.charAt(0)}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white group-hover:text-secondary transition-colors">
                            {activeTenant}
                        </div>
                        <div className="text-xs text-gray-400">Pro Plan</div>
                    </div>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
            </div>

            {/* Dropdown simulation (hidden for now) */}
        </div>
    );
}
