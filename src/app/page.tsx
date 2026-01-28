"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Target, Zap, BarChart3, ShieldCheck, Globe, Cpu } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B1221] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0B1221]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter">AI PRECISION <span className="text-purple-500">CRM</span></span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/auth/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-black hover:bg-gray-200 transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-purple-400 text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={14} /> The Future of Growth is Autonomous
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Multiply Your <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-green-400">Marketing ROI</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-400 font-medium leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            The world&apos;s first autonomous CRM that scouts leads, analyzes brand DNA,
            and executes multi-channel campaigns while you sleep.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000">
            <Link href="/auth/signup" className="group bg-gradient-to-r from-purple-600 to-blue-600 px-10 py-5 rounded-2xl text-lg font-black flex items-center gap-3 hover:shadow-2xl hover:shadow-purple-900/40 transition-all">
              Start Free Trial <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/auth/login" className="px-10 py-5 rounded-2xl text-lg font-black border border-white/10 hover:bg-white/5 transition-all">
              Access Portal
            </Link>
          </div>
        </div>

        {/* Decorative Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20 blur-[120px]">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600 rounded-full animate-pulse delay-700"></div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="text-purple-400" />,
                title: "Autonomous Scouting",
                desc: "Our AI agents crawl the web to find your ideal customers before the competition even knows they exist."
              },
              {
                icon: <Zap className="text-blue-400" />,
                title: "Instant DNA Extraction",
                desc: "Paste any URL and our engine reverse-engineers the entire brand strategy, design system, and voice."
              },
              {
                icon: <BarChart3 className="text-green-400" />,
                title: "Predictive Analytics",
                desc: "Know exactly which campaigns will perform best with AI-driven viability scoring and market gap analysis."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3 opacity-50">
            <Cpu className="w-5 h-5" />
            <span className="font-black tracking-tighter text-sm">AI PRECISION CRM</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">© 2026 Precise Technologies Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
