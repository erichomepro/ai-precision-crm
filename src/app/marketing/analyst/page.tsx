"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, Loader2, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import BrandDashboard from "@/app/components/BrandDashboard";

export default function AnalystPage() {
    const VERSION = "v2.3-STABLE";
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [dna, setDna] = useState<any>(null);
    const [brandId, setBrandId] = useState<string | null>(null);

    // Legacy states kept for compatibility, but mainly managed by Dashboard now
    const [logos, setLogos] = useState<string[]>([]);
    const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // Auto-load functionality
    useEffect(() => {
        const loadInitialBrand = async () => {
            const savedId = localStorage.getItem('last_brand_id');
            const savedUrl = localStorage.getItem('last_brand_url');

            if (savedId) {
                console.log("Loading by ID:", savedId);
                await loadBrandData(savedId, 'id');
            } else if (savedUrl) {
                console.log("Loading by URL:", savedUrl);
                setUrl(savedUrl);
                await loadBrandData(savedUrl, 'url');
            }
        };
        loadInitialBrand();
    }, []);

    const loadBrandData = async (identifier: string, method: 'id' | 'url' = 'url') => {
        setLoading(true);
        setError("");
        try {
            const body = method === 'id' ? { id: identifier } : { url: identifier };
            console.log(`[DEBUG] Fetching brand data for ${identifier} via ${method}...`);

            const res = await fetch('/api/brand/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                console.error(`[DEBUG] Fetch failed with status ${res.status}`);
            }

            const data = await res.json();
            console.log("[DEBUG] Load Response:", data);

            if (data.success && data.data) {
                const loadedDna = data.data;
                setDna(loadedDna);
                setBrandId(data.id || null);
                // Sync URL if loaded by ID
                if (data.website) setUrl(data.website);

                // Hydrate assets aggressively with null checks
                if (loadedDna.design_system) {
                    setCustomLogo(loadedDna.design_system.logo || null);
                    setLogos(loadedDna.design_system.logos || []);
                } else {
                    console.warn("[DEBUG] Loaded DNA is missing design_system");
                    setCustomLogo(null);
                    setLogos([]);
                }
                setUploadedDocs(loadedDna.knowledge_base || []);
            } else {
                console.warn("Auto-load info:", data.error || "No data returned");
            }
        } catch (e) {
            console.error("Auto-load exception:", e);
        } finally {
            setLoading(false);
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'doc') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/marketing/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                if (type === 'logo') {
                    setCustomLogo(data.url);
                    // Also update DNA structure for immediate feedback
                    setDna((prev: any) => ({
                        ...prev,
                        design_system: { ...prev.design_system, logo: data.url }
                    }));
                } else {
                    setUploadedDocs(prev => [...prev, data.url]);
                    // Update DNA structure
                    setDna((prev: any) => ({
                        ...prev,
                        knowledge_base: [...(prev.knowledge_base || []), data.url]
                    }));
                }
            } else {
                console.error("Upload failed", data.error);
            }
        } catch (err) {
            console.error("Upload error", err);
        }
    };

    // Ensure DNA state is fully synchronized during save
    const handleSave = async () => {
        if (!dna) return;
        setSaving(true);

        const finalPayload = {
            id: brandId,
            ...dna,
            business_overview: dna.business_overview, // Explicitly save the editable overview
            design_system: {
                ...dna.design_system,
                logo: customLogo || dna.design_system?.logo
            },
            knowledge_base: uploadedDocs // Explicitly save knowledge base
        };

        console.log(`[DEBUG] Saving Brand. ID: ${brandId}, rawText length: ${dna.rawText?.length || 0}`);

        try {
            const res = await fetch('/api/brand/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });
            const data = await res.json();
            if (data.success) {
                setBrandId(data.id);
                localStorage.setItem('last_brand_url', url);
                alert(data.action === 'updated' ? "Brand Saved & Updated!" : "Brand Created!");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLoad = async () => {
        if (!url) return;
        await loadBrandData(url);
    };

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true);
        setError("");
        // Keep existing DNA visible while updating? Or clear? 
        // User probably expects a refresh.
        // setDna(null); 

        try {
            const res = await fetch('/api/marketing/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            // Handle non-JSON response (e.g. 500 error page)
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Server returned invalid response. Possibly a system error.");
            }

            if (!data.success) {
                throw new Error(data.error || "Analysis failed");
            }

            // Merge meta palette into DNA for UI consistency
            const finalDna = { ...data.data };
            if (!finalDna.rawText && data.data.rawText) {
                finalDna.rawText = data.data.rawText;
            }

            if (data.meta?.palette) {
                if (!finalDna.design_system) finalDna.design_system = {};
                finalDna.design_system.palette = data.meta.palette;
            }

            setDna(finalDna);

            // Set Scraped Logos
            if (data.meta?.logos) setLogos(data.meta.logos);

            // Set Existing DB Data (if merged)
            if (data.meta?.existingId) {
                setBrandId(data.meta.existingId);
                console.log("Loaded existing brand:", data.meta.existingId);
            } else {
                setBrandId(null);
            }

            if (data.meta?.existingLogo) {
                setCustomLogo(data.meta.existingLogo);
            }
            if (data.meta?.existingKnowledgeBase) {
                setUploadedDocs(data.meta.existingKnowledgeBase);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1221] text-white p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
                <Link href="/marketing" className="flex items-center text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Command Center
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Search size={20} /></span>
                        Brand Analyst
                    </h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-6">

                {/* Input Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-xl font-semibold mb-4">Target Website</h2>
                    <div className="flex gap-4">
                        <input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            onClick={handleLoad}
                            disabled={loading || !url}
                            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all"
                            title="Load existing data from database (No Scraping)"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} className="rotate-180" />} {/* Icon for 'Load' */}
                            Load
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !url}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                            {loading ? "Analyzing..." : "Extract DNA"}
                        </button>
                    </div>
                    {/* Quick Load/History Hint could go here */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                            Error: {error}
                        </div>
                    )}
                </div>

                {/* Results Section - BRAND DASHBOARD (POMELLI STYLE) */}
                {dna && (
                    <div className="space-y-6">
                        <BrandDashboard
                            dna={dna}
                            onUpload={handleUpload}
                            onReset={() => {
                                setDna(null);
                            }}
                            onUpdateOverview={(newOverview) => {
                                setDna((prev: any) => ({ ...prev, business_overview: newOverview }));
                            }}
                            onAddColor={(newColor) => {
                                setDna((prev: any) => ({
                                    ...prev,
                                    design_system: {
                                        ...prev.design_system,
                                        palette: [...(prev.design_system?.palette || []), newColor]
                                    }
                                }));
                            }}
                            uploadedDocs={uploadedDocs}
                            customLogo={customLogo}
                            onGenerateAssets={async () => {
                                if (!brandId) {
                                    alert("Please save the brand first!");
                                    return;
                                }
                                setLoading(true);
                                try {
                                    // Call the existing nano image generation flow via API
                                    const res = await fetch('/api/marketing/generate-assets', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ brandId, dna })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        alert("Assets generating in background! They will appear here shortly.");
                                    } else {
                                        alert("Generation failed: " + data.error);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert("Asset generation error");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />

                        {/* Actions */}
                        <div className="flex flex-wrap justify-end gap-4 p-8 bg-[#1a1a1a] rounded-3xl border border-white/5">
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await fetch('/api/brand/generate-overview', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ dna })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            setDna((prev: any) => ({ ...prev, business_overview: data.overview }));
                                            alert("Overview Generated!");
                                        }
                                    } catch (e) { console.error(e); }
                                    setLoading(false);
                                }}
                                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-all"
                            >
                                <Sparkles size={20} /> Auto-Write Overview
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {brandId ? "Update Brand DNA" : "Save Brand DNA"}
                            </button>
                        </div>
                        <div className="mt-8 p-4 bg-black/50 rounded-xl text-xs font-mono text-gray-500">
                            DEBUG STATUS: <br />
                            Brand ID: {brandId || "NULL"} <br />
                            URL: {url || "NULL"} <br />
                            Docs: {uploadedDocs.length} <br />
                            Local ID: {typeof window !== 'undefined' ? localStorage.getItem('last_brand_id') : 'Server'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
