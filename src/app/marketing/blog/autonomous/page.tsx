"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Brain, Search, PenTool, BarChart, CheckCircle, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";


import ReactMarkdown from 'react-markdown';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// @ts-ignore
import { asBlob } from "html-docx-js-typescript"; // Using a different lib approach or try generic blob if possible, 
// wait, user installed html-to-docx. Let's try to use that or a simple import if it supports browser.
// If html-to-docx is problematic, I will use a simple HTML blob for now and maybe an API route for proper docx later if needed.
// For now, let's stick to the plan:
// Implementation of download handlers directly in the component.

export default function AutonomousBlogPage() {
    console.log("-----------------------------------------");
    console.log("   VERSION 2.1 LOADED - DEBUG CHECK      ");
    console.log("-----------------------------------------");
    const [topic, setTopic] = useState("");
    const [competitorUrl, setCompetitorUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    // --- State for Multi-Stage Workflow ---
    const [stage, setStage] = useState<'input' | 'review' | 'final'>('input');
    const [brief, setBrief] = useState<any>(null); // Stores the research + strategy
    const [finalResult, setFinalResult] = useState<any>(null); // Stores content + seo

    // --- Editable Brief State ---
    const [editTitle, setEditTitle] = useState("");
    const [editAngle, setEditAngle] = useState("");
    const [editOutline, setEditOutline] = useState("");

    // --- STEP 1: RESEARCH & PLAN ---
    const handlePlan = async () => {
        if (!topic) return;
        setLoading(true);
        setError("");

        // Visual Progress
        const phases = [
            "🕵️‍♂️ Researcher is scanning the web...",
            "🧠 Strategist is analyzing trends...",
            "📋 Drafting Content Brief..."
        ];
        let phaseIndex = 0;
        setStatus(phases[0]);
        const interval = setInterval(() => {
            phaseIndex = (phaseIndex + 1) % phases.length;
            setStatus(phases[phaseIndex]);
        }, 3000);

        try {
            const res = await fetch('/api/marketing/autonomous-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, competitorUrl })
            });
            const data = await res.json();
            clearInterval(interval);

            if (data.success && data.stage === 'brief') {
                setBrief(data.data);
                // Pre-fill editable fields
                setEditTitle(data.data.strategy.title);
                setEditAngle(data.data.strategy.angle);
                setEditOutline(data.data.strategy.outline);
                setStage('review');
                setStatus("Review Brief");
            } else {
                setError(data.error || "Failed to generate brief.");
            }
        } catch (e) {
            clearInterval(interval);
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2: EXECUTE WRITE ---
    const handleWrite = async () => {
        setLoading(true);
        setError("");

        // Visual Progress
        const phases = [
            "✍️ Writer is crafting the content...",
            "📈 Auditor is checking SEO scores...",
            "🔧 Editor is rewriting to fix issues...",
            "🚀 Finishing touches..."
        ];
        let phaseIndex = 0;
        setStatus(phases[0]);
        const interval = setInterval(() => {
            phaseIndex = (phaseIndex + 1) % phases.length;
            setStatus(phases[phaseIndex]);
        }, 4000);

        try {
            // Construct the Approved Brief
            const approvedBrief = {
                title: editTitle,
                angle: editAngle,
                outline: editOutline,
                tone: brief.strategy.tone,
                keywords: brief.research.keywords,
                research: brief.research
            };

            const res = await fetch('/api/marketing/autonomous-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic, // pass topic just for logging if needed
                    approvedBrief
                })
            });
            const data = await res.json();
            clearInterval(interval);

            if (data.success && data.stage === 'final') {
                setFinalResult(data.data);
                setStage('final');
                setStatus("Complete");
            } else {
                setError(data.error || "Failed to write article.");
            }
        } catch (e) {
            clearInterval(interval);
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 3: OPTIMIZE (Manual Trigger) ---
    const handleOptimize = async () => {
        if (!finalResult) return;
        setLoading(true);
        setStatus("🔧 Editor is rewriting content for SEO...");

        try {
            const res = await fetch('/api/marketing/autonomous-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'optimize',
                    currentContent: finalResult.content,
                    seoReport: finalResult.seo
                })
            });
            const data = await res.json();

            if (data.success && data.stage === 'final') {
                setFinalResult(data.data); // Update content and SEO report
                setStatus("Optimization Complete!");
            } else {
                setError(data.error || "Optimization failed.");
            }
        } catch (e) {
            setError("Network error during optimization.");
        } finally {
            setLoading(false);
        }
    };


    // --- DOWNLOAD HANDLERS ---
    const handleDownloadHTML = () => {
        if (!finalResult?.content) return;
        const element = document.createElement("a");
        const file = new Blob([finalResult.content], { type: "text/html" });
        element.href = URL.createObjectURL(file);
        element.download = `${topic.replace(/\s+/g, "_")}_blog.html`;
        document.body.appendChild(element);
        element.click();
    };

    const handleDownloadPDF = async () => {
        if (!finalResult?.content) return;
        const contentDiv = document.getElementById("blog-content-preview");
        if (!contentDiv) return;

        const canvas = await html2canvas(contentDiv as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${topic.replace(/\s+/g, "_")}_blog.pdf`);
    };

    const handleDownloadDOCX = async () => {
        if (!finalResult?.content) return;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + finalResult.content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${topic.replace(/\s+/g, "_")}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };


    return (
        <div className="min-h-screen bg-[#0B1221] text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <Link href="/marketing" className="text-gray-400 hover:text-white mr-4">
                            <ArrowLeft />
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                                Autonomous Blog Creator
                            </h1>
                            <span className="text-xs text-gray-500 font-mono">v2.1 (Live Iteration)</span>
                        </div>
                    </div>
                    {stage !== 'input' && (
                        <button
                            onClick={() => {
                                setStage('input');
                                setBrief(null);
                                setFinalResult(null);
                                setTopic("");
                                setStatus("");
                            }}
                            className="text-sm text-gray-500 hover:text-white underline"
                        >
                            Reset / New
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Controls */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* INPUT PANEL */}
                        <div className={`bg-[#1a1a1a] p-6 rounded-2xl border transition-all ${stage === 'input' ? 'border-purple-500/50 shadow-purple-900/20 shadow-lg' : 'border-white/5 opacity-50'}`}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Search className="text-purple-400" /> 1. Research & Plan
                            </h2>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                                    placeholder="Topic (e.g. AI Trends)"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    disabled={stage !== 'input' || loading}
                                />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                                    placeholder="Competitor URL (Optional)"
                                    value={competitorUrl}
                                    onChange={(e) => setCompetitorUrl(e.target.value)}
                                    disabled={stage !== 'input' || loading}
                                />
                                {stage === 'input' && (
                                    <button
                                        onClick={handlePlan}
                                        disabled={loading || !topic}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Brain size={18} />}
                                        Generate Brief
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* REVIEW PANEL */}
                        <div className={`bg-[#1a1a1a] p-6 rounded-2xl border transition-all ${stage === 'review' || stage === 'final' ? 'border-blue-500/50 shadow-blue-900/20 shadow-lg' : 'border-white/5 opacity-50'}`}>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <PenTool className="text-blue-400" /> 2. Review & Write
                            </h2>
                            {stage === 'review' ? (
                                <button
                                    onClick={handleWrite}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                    Approve & Write Article
                                </button>
                            ) : stage === 'final' ? (
                                <div className="text-sm text-green-400 font-bold flex items-center gap-2">
                                    <CheckCircle size={16} /> Article Completed
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic">Waiting for brief...</div>
                            )}
                        </div>

                        {/* Status Box */}
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 min-h-[100px] flex items-center justify-center text-center">
                            {loading ? (
                                <div className="space-y-2">
                                    <Loader2 className="animate-spin mx-auto text-purple-400" />
                                    <p className="text-purple-200 animate-pulse">{status}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">{status || "Ready to start."}</p>
                            )}
                            {error && <p className="text-red-400 mt-2">{error}</p>}
                        </div>
                    </div>


                    {/* RIGHT COLUMN: Output */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* STAGE: REVIEW BRIEF */}
                        {stage === 'review' && brief && (
                            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-blue-500/30 shadow-2xl shadow-blue-900/10 animate-in slide-in-from-right-4">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                    <div>
                                        <h2 className="text-2xl font-bold text-blue-400">Review Strategy Brief</h2>
                                        <p className="text-sm text-gray-400">Edit the plan below. The Writer Agent will follow your changes.</p>
                                    </div>
                                    <span className="text-xs bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30 font-semibold animate-pulse">
                                        Waiting for Approval...
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm text-blue-300 font-bold mb-2">Proposed Title</label>
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-xl font-bold text-white focus:border-blue-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-blue-300 font-bold mb-2">Strategic Angle</label>
                                        <textarea
                                            value={editAngle}
                                            onChange={(e) => setEditAngle(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-gray-300 h-28 focus:border-blue-500 outline-none resize-none transition-colors leading-relaxed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-blue-300 font-bold mb-2">Content Outline</label>
                                        <textarea
                                            value={editOutline}
                                            onChange={(e) => setEditOutline(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-gray-300 font-mono text-sm h-96 focus:border-blue-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/10">
                                        <h4 className="text-sm font-bold text-blue-400 mb-2">Identified Keywords:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {brief.research.keywords.map((kw: string, i: number) => (
                                                <span key={i} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded">
                                                    #{kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STAGE: FINAL RESULT */}
                        {stage === 'final' && finalResult && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                                {/* Header */}
                                <div className="flex justify-between items-center bg-gradient-to-r from-green-900/20 to-blue-900/20 p-6 rounded-2xl border border-green-500/20">
                                    <h2 className="text-2xl font-bold text-white">Generation Complete!</h2>
                                    <div className="flex gap-2">
                                        <div className={`px-4 py-2 rounded-xl text-lg font-bold border ${finalResult.seo.score >= 80 ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'}`}>
                                            SEO Score: {finalResult.seo.score}/100
                                        </div>
                                    </div>
                                </div>

                                {/* Download Buttons */}
                                <div className="flex flex-wrap gap-4">
                                    <button onClick={handleDownloadHTML} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                                        <FileText size={20} /> Download HTML
                                    </button>
                                    <button onClick={handleDownloadPDF} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20">
                                        <FileText size={20} /> Download PDF
                                    </button>
                                    <button onClick={handleDownloadDOCX} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20">
                                        <FileText size={20} /> Download DOCX
                                    </button>
                                </div>

                                {/* Content Body */}
                                <div id="blog-content-preview" className="bg-white text-black p-8 rounded-2xl shadow-2xl overflow-hidden min-h-[600px]">
                                    <div className="prose max-w-none prose-lg prose-headings:font-bold prose-h2:text-purple-800 prose-a:text-blue-600 prose-img:rounded-xl">
                                        {/* Render Images if available */}
                                        {finalResult.images && finalResult.images.length > 0 && (
                                            <div className="mb-8">
                                                <img
                                                    src={finalResult.images[0].url}
                                                    alt={finalResult.images[0].alt}
                                                    className="w-full max-h-[400px] object-cover rounded-2xl shadow-lg mb-2"
                                                />
                                                {/* Hidden prompt, only alt text shown as caption if needed, but removed per user request */}
                                            </div>
                                        )}

                                        <ReactMarkdown>{finalResult.content}</ReactMarkdown>

                                        {/* Render remaining images distributed? For now just Hero at top is safer to avoid breaking flow */}
                                    </div>
                                </div>

                                {/* SEO Report */}
                                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="flex items-center gap-2 font-bold">
                                            <BarChart size={18} className="text-blue-400" /> SEO Audit Report
                                        </h3>
                                        {finalResult.seo.score < 100 && (
                                            <button
                                                onClick={handleOptimize}
                                                disabled={loading}
                                                className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-yellow-900/20"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                                Fix Issues & Optimize
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <h4 className="text-sm text-red-400 font-bold uppercase mb-2">Issues Found</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                                {finalResult.seo.issues.length ? finalResult.seo.issues.map((iss: string, i: number) => (
                                                    <li key={i}>{iss}</li>
                                                )) : <li>No critical issues found.</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm text-green-400 font-bold uppercase mb-2">Suggestions</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                                {finalResult.seo.suggestions.map((sug: string, i: number) => (
                                                    <li key={i}>{sug}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Bottom Download Area */}
                                    <div className="border-t border-white/10 pt-6 flex justify-center">
                                        <div className="flex flex-wrap gap-4 justify-center">
                                            <p className="w-full text-center text-gray-500 text-sm mb-2">Save your article:</p>
                                            <button onClick={handleDownloadHTML} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                                                <FileText size={20} /> Save HTML
                                            </button>
                                            <button onClick={handleDownloadPDF} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20">
                                                <FileText size={20} /> Save PDF
                                            </button>
                                            <button onClick={handleDownloadDOCX} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20">
                                                <FileText size={20} /> Save DOCX
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* STAGE: EMPTY */}
                        {stage === 'input' && !loading && (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-600 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-3xl p-8 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <Brain size={32} className="opacity-50" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-500 mb-2">Multi-Agent Workflow</h2>
                                <p className="max-w-md mx-auto mb-8">
                                    Dispatch autonomous agents to research, plan, and write your content.
                                    You will review the strategy brief before the final article is written.
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
