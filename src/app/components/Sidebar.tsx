"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserPlus, Settings, LogOut, Building2, Target, Megaphone, Handshake } from 'lucide-react';
import TenantSwitcher from "./TenantSwitcher";

const Sidebar = () => {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { name: "Client Portal", path: "/dashboard", icon: LayoutDashboard },
        { name: "Company Leads", path: "/leads", icon: Building2 }, // Renamed from Lead Manager
        { name: "Client Leads", path: "/clients", icon: Users },    // New Client Manager
        { name: "Head Hunter", path: "/headhunter", icon: Target }, // NEW
        { name: "Closer", path: "/closer", icon: Handshake },       // Closer Agent
        { name: "Marketing", path: "/marketing", icon: Megaphone }, // Renamed from Agents
        { name: "Forms", path: "/forms", icon: LayoutDashboard },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <div className="w-64 bg-[#0B1221] border-r border-white/10 flex flex-col h-full">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white/90 hover:opacity-80 transition-opacity">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-lg">
                        G
                    </span>
                    God Mode
                </Link>
            </div>

            {/* Tenant Switcher */}
            <div className="p-4">
                <TenantSwitcher />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                            ${isActive(item.path)
                                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <item.icon
                            size={20}
                            className={`transition-colors ${isActive(item.path) ? "text-secondary" : "text-gray-500 group-hover:text-gray-300"}`}
                        />
                        {item.name}
                    </Link>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
                <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut size={20} />
                    Disconnect
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
