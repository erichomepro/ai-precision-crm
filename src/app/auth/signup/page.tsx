"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Mail, Lock, User, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Failed to create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1221] flex items-center justify-center p-4 relative overflow-hidden text-white">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>

            <div className="max-w-md w-full z-10 animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 mb-4 shadow-lg shadow-purple-900/10">
                        <Sparkles className="text-purple-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Join AI Precision
                    </h1>
                    <p className="text-gray-400 mt-2">Start scaling your marketing automation today.</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-3xl -z-10"></div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={14} className="text-purple-400" /> Full Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={14} className="text-purple-400" /> Email Address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Lock size={14} className="text-purple-400" /> Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600"
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
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                                    <span>Create Account</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
