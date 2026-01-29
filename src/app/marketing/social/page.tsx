"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Send, Share2, Sparkles, Copy, MessageSquare, Calendar, Trash2, Save, Image as ImageIcon, Edit2, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

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
    const [loading, setLoading] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);
    const [topic, setTopic] = useState("");
    const [brand, setBrand] = useState<any>(null);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<SocialPost[]>([]);
    const [activeTab, setActiveTab] = useState("linkedin");

    // New: Calendar State
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // New: Manual Image Prompt State
    const [customImagePrompt, setCustomImagePrompt] = useState("");

    // New: Advanced Image Controls
    const [imageStyle, setImageStyle] = useState("Photorealistic");
    const [cameraAngle, setCameraAngle] = useState("Standard");
    const [useBrandDNA, setUseBrandDNA] = useState(true);

    // New: Text Generation Toggle
    const [useBrandVoice, setUseBrandVoice] = useState(false); // Default off as requested

    // New: Platform Selection
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter', 'facebook', 'instagram']);

    const togglePlatform = (p: string) => {
        if (selectedPlatforms.includes(p)) {
            setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p));
        } else {
            setSelectedPlatforms([...selectedPlatforms, p]);
        }
    };

    // New: Schedule Modal State
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleDraft, setScheduleDraft] = useState<SocialPost | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");

    // Auto-load brand and drafts on mount
    useEffect(() => {
        const loadInitialData = async () => {
            // Load Brand
            const savedUrl = localStorage.getItem('last_brand_url');
            if (savedUrl) {
                try {
                    const res = await fetch('/api/brand/load', {
                        method: 'POST',
                        body: JSON.stringify({ url: savedUrl })
                    });
                    const data = await res.json();
                    if (data.success) setBrand(data.data);
                } catch (e) { console.error(e); }
            }

            // Load Drafts
            const savedDrafts = localStorage.getItem('marketing_social_drafts');
            if (savedDrafts) {
                setDrafts(JSON.parse(savedDrafts));
            }
        };
        loadInitialData();
    }, []);

    // Update custom image prompt when topic or content changes (if not manually edited yet)
    useEffect(() => {
        if (!generatedContent) {
            setCustomImagePrompt(topic ? `A professional photo representing: ${topic}` : "");
        }
    }, [topic, generatedContent]);

    // Helper: Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const handleOpenScheduleModal = (draft: SocialPost) => {
        setScheduleDraft(draft);
        // Default to current draft date or now
        const defaultDate = draft.scheduledDate
            ? new Date(draft.scheduledDate).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16);
        setScheduleDate(defaultDate);
        setScheduleModalOpen(true);
    };

    const confirmSchedule = async () => {
        if (!scheduleDraft || !scheduleDate) return;

        try {
            const res = await fetch('/api/social/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: {
                        linkedin: scheduleDraft.linkedin,
                        twitter: scheduleDraft.twitter,
                        facebook: scheduleDraft.facebook,
                        instagram: scheduleDraft.instagram
                    },
                    platforms: ['linkedin', 'twitter', 'facebook', 'instagram'],
                    imageUrl: scheduleDraft.selectedImage,
                    scheduledAt: new Date(scheduleDate).toISOString()
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Success: " + data.message);

                // Update local draft with new date
                const updatedDrafts = drafts.map(d =>
                    d.id === scheduleDraft.id
                        ? { ...d, scheduledDate: new Date(scheduleDate).toISOString() }
                        : d
                );
                setDrafts(updatedDrafts);
                localStorage.setItem('marketing_social_drafts', JSON.stringify(updatedDrafts));

                setScheduleModalOpen(false);
                setScheduleDraft(null);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Network error scheduling post.");
        }
    };

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
                    includeVoice: useBrandVoice // Pass the toggle
                })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedContent(data.posts);
                // Use the dedicated image prompt from the AI, or fallback to topic
                setCustomImagePrompt(data.posts.imagePrompt || topic);
            } else {
                alert("Generation failed: " + data.error);
            }
        } catch (e) {
            alert("Generation failed");
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
                    prompt: customImagePrompt, // Use the manual prompt
                    style: imageStyle,
                    camera: cameraAngle,
                    useBrandDNA: useBrandDNA,
                    brandName: brand.name, // Pass context
                    brandOverview: brand.business_overview
                })
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedImages(data.images);
            } else {
                // Show the specific error from the backend (e.g. API limits, invalid key)
                alert(`Image Generation Issue: ${data.error}\n\nFalling back to text-only mode.`);
            }
        } catch (e) {
            alert("Image generation failed network request");
        } finally {
            setImgLoading(false);
        }
    };

    const handleContentEdit = (platform: string, newText: string) => {
        setGeneratedContent((prev: any) => ({
            ...prev,
            [platform]: newText
        }));
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

        // Reset state
        setGeneratedContent(null);
        setGeneratedImages([]);
        setSelectedImage(null);
        setTopic("");
        setCustomImagePrompt("");
        alert("Draft saved to queue!");
    };

    const handleEditDraft = (draft: SocialPost) => {
        setTopic(draft.topic);
        setGeneratedContent({
            linkedin: draft.linkedin,
            twitter: draft.twitter,
            facebook: draft.facebook,
            instagram: draft.instagram
        });
        if (draft.selectedImage) {
            setGeneratedImages([draft.selectedImage]);
            setSelectedImage(draft.selectedImage);
        }
    };

    const handleDeleteDraft = (id: string) => {
        const updatedDrafts = drafts.filter(d => d.id !== id);
        setDrafts(updatedDrafts);
        localStorage.setItem('marketing_social_drafts', JSON.stringify(updatedDrafts));
    };

    // Calendar Renderer
    const renderCalendar = () => {
        const { days, firstDay } = getDaysInMonth(currentMonth);
        const slots = [];

        // Empty slots for start of month
        for (let i = 0; i < firstDay; i++) {
            slots.push(<div key={`empty-${i}`} className="h-24 bg-white/5 border border-white/5 opacity-50"></div>);
        }

        // Day slots
        for (let d = 1; d <= days; d++) {
            const dateStr = `${currentMonth.getMonth() + 1}/${d}/${currentMonth.getFullYear()}`;
            // Simple filter for demo (needs robust date comparison in prod)
            const dayDrafts = drafts.filter(draft => {
                const draftDate = new Date(draft.scheduledDate || draft.createdAt);
                return draftDate.getDate() === d && draftDate.getMonth() === currentMonth.getMonth();
            });

            slots.push(
                <div key={d} className="h-24 bg-[#1a1a1a] border border-white/10 p-2 hover:bg-white/5 transition-colors relative group">
                    <span className="text-gray-500 text-xs font-mono">{d}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[70%] custom-scrollbar">
                        {dayDrafts.map(draft => (
                            <div
                                key={draft.id}
                                onClick={() => handleEditDraft(draft)}
                                className="text-[10px] bg-purple-900/40 text-purple-200 p-1 rounded border border-purple-500/20 truncate cursor-pointer hover:bg-purple-500/40"
                            >
                                {draft.topic}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4 bg-white/5 p-2 rounded-xl">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white/10 rounded"><ArrowLeft size={16} /></button>
                    <span className="font-bold text-lg">
                        {currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white/10 rounded"><ArrowLeft size={16} className="rotate-180" /></button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 bg-black/20 rounded-xl overflow-hidden shadow-inner">
                    {slots}
                </div>
            </div>
        );
    };

    if (!brand && !loading) {
        return (
            <div className="min-h-screen bg-[#0B1221] text-white p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl mb-4">No Brand Definition Found</h2>
                    <Link href="/marketing/analyst" className="text-blue-400 hover:text-blue-300">
                        Go to Brand Analyst to scan/load a brand first.
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B1221] text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/marketing" className="flex items-center text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/5 transition-all text-gray-400 hover:text-white">
                            <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <div className="flex items-center gap-6">
                            {/* View Toggles */}
                            <div className="hidden md:flex bg-white/5 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Calendar size={14} /> Campaign View
                                </button>
                                <button
                                    onClick={() => setViewMode("calendar")}
                                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Calendar size={14} /> Calendar Grid
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                    {brand?.design_system?.logo && <img src={brand.design_system.logo} className="w-full h-full object-cover" alt="" />}
                                </div>
                                <span className="font-medium text-gray-300">{brand?.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-12">
                        {renderCalendar()}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: Generation (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Social Planner</h1>
                            <p className="text-gray-400">Create content for all platforms.</p>
                        </div>

                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 uppercase tracking-wide">Campaign Topic</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white h-32 resize-none focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="e.g. Launching our new AI automation service..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            {/* Platform Selection */}
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 uppercase tracking-wide">Target Platforms</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['linkedin', 'twitter', 'facebook', 'instagram'].map(p => (
                                        <label key={p} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${selectedPlatforms.includes(p) ? 'bg-purple-900/20 border-purple-500/50 text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'}`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedPlatforms.includes(p)}
                                                onChange={() => togglePlatform(p)}
                                            />
                                            <div className={`w-3 h-3 rounded-full border ${selectedPlatforms.includes(p) ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}></div>
                                            <span className="capitalize text-sm font-medium">{p}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Brand Voice Toggle */}
                            <label className="flex items-center cursor-pointer gap-3 select-none group p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${useBrandVoice ? 'bg-purple-600 border-purple-600' : 'border-gray-600 bg-transparent'}`}>
                                    {useBrandVoice && <Sparkles size={12} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={useBrandVoice}
                                    onChange={(e) => setUseBrandVoice(e.target.checked)}
                                />
                                <div>
                                    <span className={`text-sm font-medium ${useBrandVoice ? 'text-purple-400' : 'text-gray-400'} block`}>
                                        Use Brand Voice
                                    </span>
                                    <span className="text-xs text-gray-500">Injects guidelines from Brand Analyst</span>
                                </div>
                            </label>

                            <button
                                onClick={handleGenerate}
                                disabled={loading || !topic || selectedPlatforms.length === 0}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                {loading ? "Generating..." : "Generate Campaign"}
                            </button>
                        </div>

                        {/* Drafts Queue (Mini) */}
                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 relative z-10">
                            <h3 className="flex items-center gap-2 text-gray-400 font-medium mb-4">
                                <Calendar size={16} /> Drafts Queue ({drafts.length})
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {drafts.length === 0 && <p className="text-sm text-gray-600">No drafts yet.</p>}
                                {drafts.map(draft => (
                                    <div
                                        key={draft.id}
                                        className="bg-white/5 p-4 rounded-xl border border-white/5 group hover:border-white/10 transition-colors cursor-pointer relative"
                                        onClick={() => handleEditDraft(draft)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{draft.createdAt}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenScheduleModal(draft); }}
                                                    className="text-gray-600 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/50 rounded"
                                                    title="Schedule / Post Now"
                                                >
                                                    <Send size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.id); }}
                                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/50 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-gray-300 line-clamp-2">{draft.topic}</p>
                                        {draft.selectedImage && (
                                            <div className="mt-2 text-xs text-green-400 flex items-center gap-1"><ImageIcon size={10} /> Image Attached</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Preview & Action (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {generatedContent ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                {/* Action Bar */}
                                <div className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
                                    <h2 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className="text-purple-400" size={18} />
                                        Preview
                                    </h2>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setGeneratedContent(null)}
                                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleSaveDraft}
                                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all"
                                        >
                                            <Save size={18} />
                                            Save to Plan
                                        </button>
                                    </div>
                                </div>

                                {/* Main Content Area */}
                                <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-white/5 shadow-2xl min-h-[500px]">

                                    {/* Tabs Header */}
                                    <div className="flex gap-2 mb-6 border-b border-white/5 pb-1">
                                        {selectedPlatforms.map(platform => (
                                            <button
                                                key={platform}
                                                onClick={() => setActiveTab(platform)}
                                                className={`px-4 py-3 text-sm font-medium capitalize rounded-t-xl transition-colors ${activeTab === platform
                                                    ? 'bg-white/10 text-white border-b-2 border-blue-500'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {platform}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content (Editable) */}
                                    <div className="mb-8">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-semibold capitalize flex items-center gap-2">
                                                {activeTab} Post
                                                <Edit2 size={14} className="text-gray-500" />
                                            </h3>
                                            <button
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                                onClick={() => navigator.clipboard.writeText(generatedContent[activeTab] || "")}
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <textarea
                                            className="w-full bg-black/20 p-6 rounded-xl border border-white/5 resize-y focus:outline-none focus:border-blue-500/50 transition-colors custom-scrollbar min-h-[200px] text-gray-300 leading-relaxed font-sans text-base"
                                            value={generatedContent[activeTab] || ""}
                                            onChange={(e) => handleContentEdit(activeTab, e.target.value)}
                                            placeholder="Content will appear here..."
                                        />
                                    </div>

                                    {/* Image Section */}
                                    <div className="border-t border-white/5 pt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <ImageIcon size={18} className="text-purple-400" />
                                                Visual Assets
                                            </h3>
                                        </div>

                                        {/* Image Creator Controls */}
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 space-y-4">

                                            {/* Prompt Editor */}
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Image Prompt (Editable)</label>
                                                <textarea
                                                    className="w-full bg-transparent border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500 transition-colors h-20 resize-none"
                                                    value={customImagePrompt}
                                                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                                                    placeholder="Describe the image you want..."
                                                />
                                            </div>

                                            {/* Controls Row */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Style Dropdown */}
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Visual Style</label>
                                                    <select
                                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                                                        value={imageStyle}
                                                        onChange={(e) => setImageStyle(e.target.value)}
                                                    >
                                                        <option value="Photorealistic">Default: Photorealistic</option>

                                                        <optgroup label="Photorealistic & Photographic" className="bg-[#1a1a1a] text-gray-400 font-semibold">
                                                            <option value="Portrait Photography" className="text-white">Portrait Photography</option>
                                                            <option value="Street Photography" className="text-white">Street Photography</option>
                                                            <option value="Analog/Vintage Scan" className="text-white">Analog/Vintage Scan</option>
                                                            <option value="Aerial/Drone Photography" className="text-white">Aerial/Drone Photography</option>
                                                            <option value="Thermal/Infrared" className="text-white">Thermal/Infrared</option>
                                                        </optgroup>

                                                        <optgroup label="Artistic & Painterly" className="bg-[#1a1a1a] text-gray-400 font-semibold">
                                                            <option value="Oil Painting" className="text-white">Oil (Rich Textures)</option>
                                                            <option value="Watercolor" className="text-white">Watercolor (Soft)</option>
                                                            <option value="Charcoal Drawing" className="text-white">Charcoal (Monochromatic)</option>
                                                            <option value="Impressionism" className="text-white">Impressionism/Cubism</option>
                                                            <option value="Graffiti/Street Art" className="text-white">Graffiti/Street Art</option>
                                                        </optgroup>

                                                        <optgroup label="Digital & Illustration" className="bg-[#1a1a1a] text-gray-400 font-semibold">
                                                            <option value="Anime/Manga" className="text-white">Anime/Manga</option>
                                                            <option value="3D Animated Character" className="text-white">3D Animated Character (Startups)</option>
                                                            <option value="Cyberpunk/Neon" className="text-white">Cyberpunk/Neon</option>
                                                            <option value="Vector Illustration" className="text-white">Vector Illustration (Clean)</option>
                                                            <option value="Gothic Digital" className="text-white">Gothic Digital</option>
                                                        </optgroup>

                                                        <optgroup label="Textural & Conceptual" className="bg-[#1a1a1a] text-gray-400 font-semibold">
                                                            <option value="Digital Embroidery" className="text-white">Digital Embroidery</option>
                                                            <option value="Surrealism" className="text-white">Surrealism (Dream-like)</option>
                                                            <option value="Mosaic/Collage" className="text-white">Mosaic/Collage</option>
                                                            <option value="Papercut/Quilling" className="text-white">Papercut/3D Paper</option>
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                {/* Camera Dropdown */}
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Perspective</label>
                                                    <select
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                                                        value={cameraAngle}
                                                        onChange={(e) => setCameraAngle(e.target.value)}
                                                    >
                                                        <option value="Standard">Standard View</option>
                                                        <option value="Close-up">Close Up / Macro</option>
                                                        <option value="Wide Angle">Wide Angle</option>
                                                        <option value="Drone View">Drone / Aerial</option>
                                                        <option value="Low Angle">Low Angle (Heroic)</option>
                                                        <option value="Bokeh">Bokeh (Blurred Background)</option>
                                                    </select>
                                                </div>

                                                {/* Brand DNA Toggle */}
                                                <div className="flex items-center h-full pt-4">
                                                    <label className="flex items-center cursor-pointer gap-2 select-none group">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${useBrandDNA ? 'bg-green-500 border-green-500' : 'border-gray-500 bg-transparent'}`}>
                                                            {useBrandDNA && <Sparkles size={12} className="text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={useBrandDNA}
                                                            onChange={(e) => setUseBrandDNA(e.target.checked)}
                                                        />
                                                        <span className={`text-sm ${useBrandDNA ? 'text-green-400 font-medium' : 'text-gray-500'} group-hover:text-gray-300 transition-colors`}>
                                                            Inject Brand DNA
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex justify-end">
                                                <button
                                                    onClick={handleGenerateImages}
                                                    disabled={imgLoading}
                                                    className="flex items-center gap-2 text-xs bg-white/10 hover:bg-purple-500/20 hover:text-purple-300 px-3 py-2 rounded-lg transition-colors border border-white/5 hover:border-purple-500/30"
                                                >
                                                    {imgLoading ? <Loader2 size={12} className="animate-spin relative" /> : <RefreshCw size={12} />}
                                                    {generatedImages.length > 0 ? "Regenerate Images" : "Generate Images"}
                                                </button>
                                            </div>
                                        </div>

                                        {generatedImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {generatedImages.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setSelectedImage(img)}
                                                        className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${selectedImage === img ? 'border-green-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                                                            }`}
                                                    >
                                                        <img src={img} className="w-full h-48 object-cover" />
                                                        {selectedImage === img && (
                                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg">Selected</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                                <Sparkles size={48} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium text-gray-400">Ready to Ideate</p>
                                <p className="text-sm opacity-60">Enter a topic on the left to generate customized posts.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Schedule Modal */}
            {scheduleModalOpen && scheduleDraft && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calendar className="text-purple-400" />
                            Schedule Post
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Campaign Topic</label>
                                <p className="text-white font-medium bg-white/5 p-3 rounded-lg border border-white/5 line-clamp-2">
                                    {scheduleDraft.topic}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Pick Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    This will trigger the Make.com automation at the selected time (handled via external automation logic) or immediately depending on your Make setup.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setScheduleModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSchedule}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={16} />
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
}
