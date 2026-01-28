"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Send, Share2, Sparkles, Copy, MessageSquare, Calendar, Trash2, Save, Image as ImageIcon, Edit2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

interface SocialPost {
    id: string;
    topic: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
    selectedImage?: string;
    createdAt: string;
    scheduledDate?: string;
}

export default function SocialPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const [topic, setTopic] = useState("");
    const [brand, setBrand] = useState<any>(null);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<SocialPost[]>([]);
    const [activeTab, setActiveTab] = useState("linkedin");
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [customImagePrompt, setCustomImagePrompt] = useState("");
    const [imageStyle, setImageStyle] = useState("Photorealistic");
    const [cameraAngle, setCameraAngle] = useState("Standard");
    const [useBrandDNA, setUseBrandDNA] = useState(true);
    const [useBrandVoice, setUseBrandVoice] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter', 'facebook', 'instagram']);

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleDraft, setScheduleDraft] = useState<SocialPost | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");

    useEffect(() => {
        if (!user) return; // Wait for auth

        const loadInitialData = async () => {
            const savedUrl = localStorage.getItem('last_brand_url');
            if (savedUrl) {
                try {
                    const res = await fetch('/api/brand/load', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: savedUrl,
                            userId: user.uid // KEY: Isolation
                        })
                    });
                    const data = await res.json();
                    if (data.success) setBrand(data.data);
                } catch (e) { console.error(e); }
            }

            const savedDrafts = localStorage.getItem('marketing_social_drafts');
            if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
        };
        loadInitialData();
    }, [user]);

    const handleGenerate = async () => {
        if (!brand || !topic) return;
        setLoading(true);
        setGeneratedImages([]);
        setSelectedImage(null);

        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    brandContext: brand,
                    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ['linkedin', 'twitter', 'facebook', 'instagram'],
                    includeVoice: useBrandVoice
                })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedContent(data.posts);
                setCustomImagePrompt(data.posts.imagePrompt || topic);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateImages = async () => {
        if (!brand) return;
        setImgLoading(true);

        try {
            const res = await fetch('/api/social/generate-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandId: brand.id,
                    prompt: customImagePrompt,
                    style: imageStyle,
                    camera: cameraAngle,
                    useBrandDNA: useBrandDNA,
                    brandName: brand.name,
                    brandOverview: brand.business_overview
                })
            });
            const data = await res.json();
            if (data.success) setGeneratedImages(data.images);
        } finally {
            setImgLoading(false);
        }
    };

    const handleSaveDraft = () => {
        if (!generatedContent || !topic) return;
        const newDraft: SocialPost = {
            id: Date.now().toString(),
            topic,
            linkedin: generatedContent.linkedin || "",
            twitter: generatedContent.twitter || "",
            facebook: generatedContent.facebook || "",
            instagram: generatedContent.instagram || "",
            selectedImage: selectedImage || undefined,
            createdAt: new Date().toLocaleDateString(),
            scheduledDate: new Date().toISOString()
        };

        const updatedDrafts = [newDraft, ...drafts];
        setDrafts(updatedDrafts);
        localStorage.setItem('marketing_social_drafts', JSON.stringify(updatedDrafts));
        setGeneratedContent(null);
    };

    return (
        <div className="animate-in fade-in duration-1000">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight">Social Planner</h1>
                    <p className="text-gray-400">Omni-channel campaign orchestration & scheduling.</p>
                </div>
                <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
                    <button onClick={() => setViewMode("list")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>QUEUE</button>
                    <button onClick={() => setViewMode("calendar")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>CALENDAR</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Inputs */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 block">Campaign Narrative</label>
                        <textarea
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white min-h-[120px] outline-none focus:border-purple-500/50"
                            placeholder="What are we highlighting today?"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />

                        <div className="mt-8 space-y-4">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 block">Platforms</label>
                            <div className="flex gap-2 flex-wrap">
                                {['linkedin', 'twitter', 'facebook', 'instagram'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${selectedPlatforms.includes(p) ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10 text-gray-600'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !topic}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl font-black mt-10 shadow-lg shadow-purple-900/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Orchestrate Content"}
                        </button>
                    </div>
                </div>

                {/* Display */}
                <div className="lg:col-span-8">
                    {generatedContent ? (
                        <div className="bg-white/[0.03] border border-white/5 rounded-[40px] p-10 animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black capitalize">{activeTab} Preview</h3>
                                <button onClick={handleSaveDraft} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-green-900/20">Save to Queue</button>
                            </div>

                            <textarea
                                className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-lg text-gray-300 min-h-[300px] outline-none"
                                value={generatedContent[activeTab]}
                                readOnly
                            />
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[48px] p-20 text-center text-gray-600">
                            <ImageIcon size={64} className="opacity-10 mb-6" />
                            <h3 className="text-3xl font-black opacity-30">Plan Visualized</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
