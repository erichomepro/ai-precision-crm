"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1221] flex items-center justify-center p-4 relative overflow-hidden text-white">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>

            <div className="max-w-md w-full z-10 animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4 shadow-lg shadow-blue-900/10">
                        <Sparkles className="text-blue-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 mt-2">Sign in to manage your AI precision assets.</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl -z-10"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={14} className="text-blue-400" /> Email Address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-600"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={14} className="text-blue-400" /> Password
                                </label>
                                <button type="button" className="text-[10px] text-gray-500 hover:text-blue-400 uppercase tracking-tighter transition-colors">
                                    Forgot Password?
                                </button>
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-sm animate-pulse text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 group text-lg"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-sm">
                            Don't have an account?{" "}
                            <Link href="/auth/signup" className="text-blue-400 font-bold hover:text-blue-300 transition-colors inline-flex items-center gap-1 group">
                                Create Account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
