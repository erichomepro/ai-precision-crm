import { ArrowRight, Download, Edit2, Globe, Image as ImageIcon, Sparkles, Trash2, Upload, Save, Plus } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface BrandDashboardProps {
    dna: any;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'doc') => void;
    onReset: () => void;
    onUpdateOverview: (newOverview: string) => void;
    onAddColor: (color: string) => void;
    onGenerateAssets?: () => void;
    uploadedDocs: string[];
    customLogo?: string | null;
}

export default function BrandDashboard({ dna, onUpload, onReset, uploadedDocs, customLogo, onUpdateOverview, onAddColor, onGenerateAssets }: BrandDashboardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    if (!dna) return null;

    const [isEditingOverview, setIsEditingOverview] = useState(false);
    const [localOverview, setLocalOverview] = useState(dna.business_overview || dna.rawText || "");

    const { design_system, rawText } = dna;
    // Fallback values
    const palette = design_system?.palette || ["#000000", "#ffffff"];
    const primaryFont = design_system?.fontFamily || "Inter";
    const logoUrl = customLogo || (design_system?.logos?.length ? design_system.logos[0] : null);

    // Sync local state when prop changes (e.g. after Auto-Write)
    useEffect(() => {
        if (dna.business_overview) {
            setLocalOverview(dna.business_overview);
        } else if (dna.rawText && !localOverview) {
            setLocalOverview(dna.rawText);
        }
    }, [dna.business_overview, dna.rawText]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header Card */}
            <div className="bg-[#1a1a1a] rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/5 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-black/50 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Brand Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-3xl font-bold text-gray-600">{dna.name?.[0] || "B"}</span>
                            )}
                        </div>
                        {/* Hover Upload for Logo */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer">
                            <Upload className="text-white w-6 h-6" />
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => onUpload(e, 'logo')}
                            />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{dna.name || "Unknown Brand"}</h1>
                        <a href={dna.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-sm">
                            <Globe size={14} />
                            {dna.website}
                        </a>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 border border-white/10 transition-colors"
                    >
                        <Upload size={16} />
                        Upload Images
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => onUpload(e, 'doc')}
                    />
                    <button
                        onClick={onGenerateAssets}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
                    >
                        <Sparkles size={16} />
                        Generate Images
                    </button>
                    <button onClick={onReset} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        Reset
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Typography Card */}
                <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-white/5">
                    <h3 className="text-gray-400 font-medium mb-6">Typography</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="text-6xl font-light text-white mb-4" style={{ fontFamily: primaryFont }}>Aa</div>
                            <p className="text-sm text-gray-500 font-mono">{primaryFont}</p>
                            <p className="text-xs text-gray-600 mt-1">Primary Font</p>
                        </div>
                        <div>
                            <div className="text-6xl font-bold text-white mb-4" style={{ fontFamily: design_system?.h1Font || primaryFont }}>Aa</div>
                            <p className="text-sm text-gray-500 font-mono">{design_system?.h1Font || "Secondary"}</p>
                            <p className="text-xs text-gray-600 mt-1">Headings</p>
                        </div>
                    </div>
                </div>

                {/* Colors Card */}
                <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-white/5">
                    <h3 className="text-gray-400 font-medium mb-6">Brand Palette</h3>
                    <div className="flex flex-wrap gap-6">
                        {palette.map((color: string, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <div
                                    className="w-16 h-16 rounded-full shadow-lg border border-white/5 transition-transform hover:scale-110 cursor-pointer"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                                <span className="text-xs text-gray-500 font-mono">{color}</span>
                            </div>
                        ))}
                        {/* Add Color Button */}
                        <button
                            onClick={() => {
                                const color = prompt("Enter Hex Code (e.g. #FF0000)");
                                if (color) onAddColor(color);
                            }}
                            className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600 hover:border-white/30 hover:text-gray-400 transition-colors cursor-pointer"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Brand Voice & Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Voice Tags */}
                <div className="md:col-span-1 bg-[#1a1a1a] rounded-3xl p-8 border border-white/5">
                    <h3 className="text-gray-400 font-medium mb-6">Brand Voice</h3>
                    <div className="flex flex-wrap gap-2">
                        {/* Mock tags if none exist, or parse from raw text/tone */}
                        {["Professional", "Direct", "Results-Oriented", "Tech-Forward", "Sophisticated"].map(tag => (
                            <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="mt-8">
                        <h4 className="text-gray-400 font-medium mb-2">Key Themes</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            AI Automation, Efficiency, Scalability, Precision.
                        </p>
                    </div>
                </div>

                {/* Business Overview */}
                <div className="md:col-span-2 bg-[#1a1a1a] rounded-3xl p-8 border border-white/5 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Sparkles size={100} className="text-white" />
                    </div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="text-gray-400 font-medium">Business Overview</h3>
                        <button
                            onClick={() => {
                                if (isEditingOverview) {
                                    // Handle Save
                                    onUpdateOverview(localOverview);
                                    setIsEditingOverview(false);
                                } else {
                                    // Handle Edit
                                    setIsEditingOverview(true);
                                }
                            }}
                            className="text-blue-400 text-sm font-medium hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {isEditingOverview ? (
                                <>Save Overview <Save size={14} /></>
                            ) : (
                                <>Edit Overview <Edit2 size={14} /></>
                            )}
                        </button>
                    </div>

                    <div className="prose prose-invert max-w-none flex-1 z-10 relative">
                        {isEditingOverview ? (
                            <textarea
                                className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-blue-500 transition-colors resize-none font-sans leading-relaxed"
                                value={localOverview}
                                onChange={(e) => setLocalOverview(e.target.value)}
                                placeholder="Enter a comprehensive business overview..."
                            />
                        ) : (
                            <div className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                                {localOverview || "No overview available. Generate or write one to get started."}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Media/Knowledge Base Grid */}
            <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-gray-400 font-medium">Knowledge Base & Assets</h3>
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                        {uploadedDocs.length} items
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* Add New Card */}
                    <div className="aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group relative">
                        <Upload className="text-gray-500 group-hover:text-blue-400" />
                        <span className="text-xs text-gray-500 font-medium">Upload File</span>
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => onUpload(e, 'doc')}
                        />
                    </div>

                    {/* File Cards */}
                    {uploadedDocs.map((doc, i) => (
                        <div key={i} className="aspect-square bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col justify-between group relative hover:border-blue-500/30 transition-all">

                            {/* Icon based on type */}
                            <div className="flex-1 flex items-center justify-center">
                                {doc.endsWith('.png') || doc.endsWith('.jpg') ? (
                                    <img src={doc} className="w-full h-full object-cover rounded-lg opacity-80" />
                                ) : (
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                                        <span className="text-xs font-bold text-gray-500">PDF</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-gray-500 truncate mt-2">{doc.split('/').pop()}</p>

                            {/* Actions */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <a
                                    href={doc}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500/80 p-1.5 rounded-lg text-white hover:bg-blue-600"
                                >
                                    <Download size={12} />
                                </a>
                                <button className="bg-red-500/80 p-1.5 rounded-lg text-white hover:bg-red-600">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
