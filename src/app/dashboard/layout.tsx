"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Settings,
    LogOut,
    Sparkles,
    BarChart3,
    Search,
    Loader2,
    Target,
    Handshake,
    Megaphone
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login");
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/auth/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500" size={48} />
            </div>
        );
    }

    if (!user) return null;

    const navItems = [
        { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
        { label: "Leads", icon: Users, href: "/dashboard/leads" },
        { label: "Head Hunter", icon: Target, href: "/headhunter" },
        { label: "Closer Agent", icon: Handshake, href: "/closer" },
        { label: "Blog Creator", icon: MessageSquare, href: "/dashboard/marketing/blog" },
        { label: "Social Planner", icon: Sparkles, href: "/dashboard/marketing/social" },
        { label: "Marketing Hub", icon: Megaphone, href: "/marketing" },
    ];

    return (
        <div className="min-h-screen bg-[#0B1221] flex text-white font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white/[0.02] border-r border-white/5 flex flex-col p-6 z-20">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/40">
                        <Sparkles size={20} />
                    </div>
                    <span className="text-xl font-black tracking-tighter">AI PRECISION</span>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 p-3 rounded-xl transition-all group"
                        >
                            <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center font-bold text-xs uppercase overflow-hidden border-2 border-purple-500/50">
                            {user.displayName?.[0] || user.email?.[0]}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-bold truncate">{user.displayName || "User"}</span>
                            <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/5 p-3 rounded-xl transition-all group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-y-auto">
                {/* Header / Top Bar */}
                <header className="sticky top-0 h-20 bg-[#0B1221]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 z-10">
                    <div className="relative group w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search campaigns, leads, or assets..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 outline-none focus:border-purple-500/50 transition-all font-medium placeholder:text-gray-600"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-gray-400 hover:text-white relative">
                            <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0B1221]"></span>
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                <div className="p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
