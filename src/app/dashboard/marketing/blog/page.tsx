"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Brain, Search, PenTool, BarChart, CheckCircle, FileText, ArrowRight, Code2, RefreshCw } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAuth } from "@/context/auth-context";

export default function AutonomousBlogPage() {
    const { user } = useAuth();
    const [topic, setTopic] = useState("");
    const [competitorUrl, setCompetitorUrl] = useState("");
    const [targetUrl, setTargetUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [imageFocus, setImageFocus] = useState("");

    const [optimizing, setOptimizing] = useState(false);
    const [regeneratingImages, setRegeneratingImages] = useState(false);

    const [stage, setStage] = useState<'input' | 'review' | 'final'>('input');
    const [brief, setBrief] = useState<any>(null);
    const [finalResult, setFinalResult] = useState<any>(null);

    const [editTitle, setEditTitle] = useState("");
    const [editAngle, setEditAngle] = useState("");
    const [editOutline, setEditOutline] = useState("");

    const handlePlan = async () => {
        if (!topic) return;
        setLoading(true);
        setError("");

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

    const handleWrite = async () => {
        setLoading(true);
        setError("");

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
                    topic,
                    targetUrl,
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

    const handleOptimize = async () => {
        if (!finalResult) return;
        setOptimizing(true);
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
                setFinalResult({
                    ...data.data,
                    images: data.data.images?.length > 0 ? data.data.images : finalResult.images
                });
                setStatus("Optimization Complete!");
            } else {
                setError(data.error || "Optimization failed.");
            }
        } catch (e) {
            setError("Network error during optimization.");
        } finally {
            setOptimizing(false);
        }
    };

    const handleRegenerateImages = async () => {
        if (!finalResult) return;
        setRegeneratingImages(true);
        setStatus("🎨 Visual Director is creating new images...");

        try {
            const res = await fetch('/api/marketing/autonomous-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_images',
                    currentContent: finalResult.content,
                    imageFocus: imageFocus
                })
            });
            const data = await res.json();

            if (data.success) {
                setFinalResult({
                    ...finalResult,
                    images: data.data.images
                });
                setStatus("Images Regenerated!");
            } else {
                setError(data.error || "Image generation failed.");
            }
        } catch (e) {
            setError("Network error during image generation.");
        } finally {
            setRegeneratingImages(false);
        }
    };


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

        const canvas = await html2canvas(contentDiv as HTMLElement, { scale: 2, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${topic.replace(/\s+/g, "_")}_blog.pdf`);
    };

    const handleDownloadDOCX = async () => {
        if (!finalResult?.content) return;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export Word</title></head><body>";
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
        <div className="animate-in fade-in duration-1000">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight">Blog Creator</h1>
                    <p className="text-gray-400">Autonomous multi-agent content generation engine.</p>
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
                        className="text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        NEW CAMPAIGN
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Control Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className={`bg-white/[0.03] border rounded-[32px] p-8 transition-all ${stage === 'input' ? 'border-purple-500/30' : 'border-white/5 opacity-50'}`}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Brain className="text-purple-400" size={24} /> 1. Configuration
                        </h2>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium"
                                placeholder="Core Topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={stage !== 'input' || loading}
                            />
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium"
                                placeholder="Competitor Link (Ref)"
                                value={competitorUrl}
                                onChange={(e) => setCompetitorUrl(e.target.value)}
                                disabled={stage !== 'input' || loading}
                            />
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500/50 transition-all font-medium"
                                placeholder="Internal Target URL"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                disabled={stage !== 'input' || loading}
                            />
                            {stage === 'input' && (
                                <button
                                    onClick={handlePlan}
                                    disabled={loading || !topic}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl font-black shadow-lg shadow-purple-900/20 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin inline mr-2" /> : <Search size={20} className="inline mr-2" />}
                                    Scout & Plan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status Console */}
                    <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 min-h-[120px] flex flex-col items-center justify-center text-center">
                        {loading ? (
                            <div className="space-y-3">
                                <div className="flex justify-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                                <p className="text-purple-300 font-bold text-sm uppercase tracking-widest">{status}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500 font-medium italic">{status || "Engine Idle - Waiting for input..."}</p>
                        )}
                    </div>
                </div>

                {/* Output Area */}
                <div className="lg:col-span-8">
                    {stage === 'review' && brief && (
                        <div className="bg-white/[0.03] border border-blue-500/30 rounded-[40px] p-10 animate-in slide-in-from-right-10 duration-700">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-blue-400">Strategic Outline</h2>
                                    <p className="text-gray-400 mt-1">Review the AI proposed plan for maximum impact.</p>
                                </div>
                                <button
                                    onClick={handleWrite}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
                                >
                                    <Sparkles size={20} /> Deploy Writer
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-blue-300/50 uppercase tracking-widest">Optimized Title</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xl font-bold text-white outline-none focus:border-blue-500"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-blue-300/50 uppercase tracking-widest">Target Angle</label>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-gray-300 min-h-[100px] outline-none focus:border-blue-500"
                                        value={editAngle}
                                        onChange={(e) => setEditAngle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-blue-300/50 uppercase tracking-widest">Content Structure (H-Hierarchy)</label>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-gray-400 font-mono text-sm min-h-[400px] outline-none focus:border-blue-500"
                                        value={editOutline}
                                        onChange={(e) => setEditOutline(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === 'final' && finalResult && (
                        <div className="space-y-8 animate-in fade-in duration-700">
                            {/* Score Card */}
                            <div className="bg-white/[0.03] border border-white/5 rounded-[40px] p-10 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex gap-4">
                                        <button onClick={handleDownloadPDF} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all">
                                            <FileText className="text-purple-400" />
                                        </button>
                                        <button onClick={handleDownloadHTML} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all">
                                            <Code2 className="text-blue-400" />
                                        </button>
                                    </div>
                                    <div className={`px-8 py-4 rounded-3xl border-2 font-black text-2xl ${finalResult.seo.score >= 80 ? 'border-green-500/50 text-green-400 bg-green-500/5' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/5'}`}>
                                        SEO: {finalResult.seo.score}/100
                                    </div>
                                </div>

                                <div id="blog-content-preview" className="bg-white text-[#0B1221] p-12 rounded-[40px] shadow-2xl">
                                    <div className="prose max-w-none prose-lg prose-headings:font-black prose-img:rounded-[32px]">
                                        {finalResult.images?.[0] && (
                                            <img src={finalResult.images[0].url} alt={finalResult.images[0].alt} crossOrigin="anonymous" className="w-full h-[400px] object-cover mb-10" />
                                        )}
                                        <div dangerouslySetInnerHTML={{ __html: finalResult.content }} />
                                    </div>
                                </div>
                            </div>

                            {/* Assets Designer */}
                            <div className="bg-black/40 border border-white/5 rounded-[40px] p-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black flex items-center gap-3">
                                        <Sparkles className="text-purple-400" /> Visual Assets
                                    </h3>
                                    <div className="flex gap-3">
                                        <input
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm w-64 outline-none focus:border-purple-500/50"
                                            placeholder="Style guidance..."
                                            value={imageFocus}
                                            onChange={(e) => setImageFocus(e.target.value)}
                                        />
                                        <button
                                            onClick={handleRegenerateImages}
                                            disabled={regeneratingImages}
                                            className="bg-purple-600 hover:bg-purple-500 px-6 rounded-xl font-bold flex items-center gap-2"
                                        >
                                            {regeneratingImages ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                            Regenerate
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    {finalResult.images.map((img: any, i: number) => (
                                        <div key={i} className="aspect-video rounded-3xl overflow-hidden border border-white/5 group relative">
                                            <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                <p className="text-[10px] font-bold text-center">{img.alt}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === 'input' && !loading && (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[48px] p-20 text-center">
                            <div className="w-32 h-32 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                                <Sparkles size={64} className="text-gray-700" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-500 mb-4">Awaiting Command</h2>
                            <p className="max-w-md text-gray-600 font-medium">Configure your research parameters in the left panel to begin the autonomous content workflow.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
