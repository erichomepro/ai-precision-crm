"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, Loader2, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import BrandDashboard from "@/app/components/BrandDashboard";
import { useAuth } from "@/context/auth-context";

export default function AnalystPage() {
    const { user } = useAuth();
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [dna, setDna] = useState<any>(null);
    const [brandId, setBrandId] = useState<string | null>(null);
    const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
    const [customLogo, setCustomLogo] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadInitialBrand = async () => {
            const savedId = localStorage.getItem('last_brand_id');
            const savedUrl = localStorage.getItem('last_brand_url');
            if (savedId) await loadBrandData(savedId, 'id');
            else if (savedUrl) await loadBrandData(savedUrl, 'url');
        };
        loadInitialBrand();
    }, []);

    const loadBrandData = async (identifier: string, method: 'id' | 'url' = 'url') => {
        if (!user) return; // Must be logged in

        setLoading(true);
        setError("");
        try {
            const body: any = method === 'id' ? { id: identifier } : { url: identifier };
            body.userId = user.uid; // KEY: Pass userId for isolation

            const res = await fetch('/api/brand/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success && data.data) {
                setDna(data.data);
                setBrandId(data.id || null);
                if (data.website) setUrl(data.website);
                if (data.data.design_system) {
                    setCustomLogo(data.data.design_system.logo || null);
                }
                setUploadedDocs(data.data.knowledge_base || []);
            }
        } finally {
            setLoading(false);
        }
    }

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch('/api/marketing/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.success) {
                setDna(data.data);
                if (data.meta?.existingId) setBrandId(data.meta.existingId);
            } else {
                setError(data.error || "Analysis failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!dna) return;
        setSaving(true);
        try {
            const finalPayload = {
                id: brandId,
                ...dna,
                userId: user?.uid,
                knowledge_base: uploadedDocs,
                design_system: {
                    ...dna.design_system,
                    logo: customLogo || dna.design_system?.logo
                }
            };
            const res = await fetch('/api/brand/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });
            const data = await res.json();
            if (data.success) {
                setBrandId(data.id);
                localStorage.setItem('last_brand_id', data.id);
                alert("Brand intelligence persistent!");
            }
        } finally {
            setSaving(false);
        }
    };

    // Re-implemented required props handlers
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'doc') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/marketing/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                if (type === 'logo') setCustomLogo(data.url);
                else setUploadedDocs(prev => [...prev, data.url]);
            }
        } catch (err) { console.error("Upload error", err); }
    };

    const handleReset = () => {
        setDna(null);
        setBrandId(null);
        setCustomLogo(null);
        setUploadedDocs([]);
    };

    const handleUpdateOverview = (newOverview: string) => {
        setDna((prev: any) => ({ ...prev, business_overview: newOverview }));
    };

    const handleAddColor = (color: string) => {
        setDna((prev: any) => ({
            ...prev,
            design_system: {
                ...prev.design_system,
                palette: [...(prev.design_system?.palette || []), color]
            }
        }));
    };

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight text-white">Brand Analyst</h1>
                    <p className="text-gray-400">Extracting competitive advantages from digital footprints.</p>
                </div>
                <div className="flex gap-4">
                    <input
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white w-[400px] font-medium outline-none focus:border-blue-500/50 [color-scheme:dark]"
                        placeholder="Target Website URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 px-8 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        Analyze
                    </button>
                </div>
            </div>

            {dna ? (
                <div className="space-y-10">
                    <BrandDashboard
                        dna={dna}
                        onUpload={handleUpload}
                        onReset={handleReset}
                        onUpdateOverview={handleUpdateOverview}
                        onAddColor={handleAddColor}
                        uploadedDocs={uploadedDocs}
                        customLogo={customLogo}
                    />
                    <div className="flex justify-end pt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-500 px-10 py-4 rounded-[24px] font-black text-white shadow-xl shadow-green-900/40 transition-all active:scale-95"
                        >
                            {saving ? "Storing Intelligence..." : "Commit Brand DNA"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-96 flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[48px] p-20 text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Search size={32} className="text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-500">No Brand Selected</h3>
                    <p className="text-gray-600 max-w-sm">Enter a website and click extract to begin the competitive analysis phase.</p>
                </div>
            )}
        </div>
    );
}
