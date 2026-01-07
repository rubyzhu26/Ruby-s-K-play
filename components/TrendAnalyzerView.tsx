
import React, { useState, useRef, useEffect } from 'react';
import { TrendAnalysisResult } from '../types';
import { analyzeTrendImage, generateVisualImage } from '../services/geminiService';

const TrendAnalyzerView: React.FC = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<TrendAnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New State for features
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());

    // Magic Poster Studio State
    const [studioData, setStudioData] = useState<{ 
        bgUrl: string; 
        headline: string; 
        subtext: string; 
        textColor: string;
        // Configs
        headlineSize: number; // % of height
        headlineY: number;    // % of height
        headlineX: number;    // % of width (NEW)
        subtextSize: number;  // % of height
        subtextY: number;     // % of height
        subtextX: number;     // % of width (NEW)
        textAlign: 'left' | 'center' | 'right'; // (NEW)
        showShadow: boolean;
    } | null>(null);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setResult(null);

        // Analyze
        setIsAnalyzing(true);
        try {
            const analysisData = await analyzeTrendImage(file);
            setResult(analysisData);
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Oops! Could not analyze the image. Please try another one.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownload = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `trend-bg-${index}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRegenerateBackground = async (index: number, prompt: string) => {
        if (regeneratingIndices.has(index)) return;

        setRegeneratingIndices(prev => new Set(prev).add(index));
        try {
            const newUrl = await generateVisualImage(prompt);
            setResult(prev => {
                if (!prev) return null;
                const newBackgrounds = [...prev.generated_backgrounds];
                // Update url but keep prompt and style_label
                newBackgrounds[index] = { ...newBackgrounds[index], url: newUrl };
                return { ...prev, generated_backgrounds: newBackgrounds };
            });
        } catch (e) {
            console.error("Regeneration failed", e);
            alert("Failed to regenerate this variation. Please try again.");
        } finally {
            setRegeneratingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const openMagicStudio = (bgUrl: string) => {
        if (!result) return;
        setStudioData({
            bgUrl: bgUrl,
            headline: result.extracted_text.headline || "YOUR HEADLINE",
            subtext: result.extracted_text.subtext || "Add your details here",
            textColor: '#000000', 
            headlineSize: 8, 
            headlineY: 40,
            headlineX: 50,   
            subtextSize: 3.5,  
            subtextY: 65,
            subtextX: 50,
            textAlign: 'center',
            showShadow: false
        });
    };

    const handleDownloadPoster = () => {
        if (!canvasRef.current || !studioData) return;
        
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `magic-poster-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Draw canvas whenever studioData changes
    useEffect(() => {
        if (!studioData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = studioData.bgUrl;
        
        img.onload = () => {
            // 1. Setup Canvas
            canvas.width = img.width;
            canvas.height = img.height;

            // 2. Draw Background
            ctx.drawImage(img, 0, 0);

            // 3. Configure Text Style
            ctx.textAlign = studioData.textAlign;
            ctx.fillStyle = studioData.textColor;
            
            // Optional Shadow for better legibility
            if (studioData.showShadow) {
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = canvas.width * 0.01;
                ctx.shadowOffsetX = canvas.width * 0.002;
                ctx.shadowOffsetY = canvas.width * 0.002;
            } else {
                ctx.shadowColor = "transparent";
            }

            const maxWidth = canvas.width * 0.9; // 90% width max

            // --- HELPER: WRAPPED TEXT DRAWER ---
            const drawWrappedText = (text: string, fontSize: number, startY: number, startX: number, lineHeightMultiplier: number, fontWeight: string) => {
                ctx.font = `${fontWeight} ${fontSize}px 'Quicksand', sans-serif`;
                
                // Split by user's explicit newlines first
                const paragraphs = text.split('\n');
                let currentY = startY;

                paragraphs.forEach(paragraph => {
                    const words = paragraph.split(' ');
                    let line = '';

                    for (let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        const testWidth = metrics.width;
                        
                        // Check wrap based on alignment anchor
                        // Simple logic: check if line exceeds maxWidth relative to center, 
                        // but since we rely on ctx.textAlign, fillText handles the anchor.
                        // We just need to ensure the line isn't insanely long.
                        
                        if (testWidth > maxWidth && n > 0) {
                            ctx.fillText(line, startX, currentY);
                            line = words[n] + ' ';
                            currentY += fontSize * lineHeightMultiplier;
                        } else {
                            line = testLine;
                        }
                    }
                    ctx.fillText(line, startX, currentY);
                    currentY += fontSize * lineHeightMultiplier;
                });
            };

            // 4. Draw Headline
            const headlinePx = Math.floor(canvas.height * (studioData.headlineSize / 100));
            const headlineYPx = canvas.height * (studioData.headlineY / 100);
            const headlineXPx = canvas.width * (studioData.headlineX / 100);
            drawWrappedText(studioData.headline, headlinePx, headlineYPx, headlineXPx, 1.2, "900");

            // 5. Draw Subtext
            const subtextPx = Math.floor(canvas.height * (studioData.subtextSize / 100));
            const subtextYPx = canvas.height * (studioData.subtextY / 100);
            const subtextXPx = canvas.width * (studioData.subtextX / 100);
            drawWrappedText(studioData.subtext, subtextPx, subtextYPx, subtextXPx, 1.4, "500");
        };
    }, [studioData]);

    return (
        <div className="animate-fade-in pb-20 space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl p-8 shadow-xl text-white mb-8">
                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <span className="text-4xl">🕵️‍♀️</span> Trend Scout
                </h2>
                <p className="opacity-90 font-medium">Upload a best-selling poster. AI will steal its style secrets and generate fresh backgrounds for you!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Upload & Preview */}
                <div className="lg:col-span-4 space-y-6">
                    <div 
                        className={`
                            border-4 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[400px]
                            ${previewUrl ? 'border-pink-300 bg-white' : 'border-gray-300 hover:border-pink-400 bg-gray-50 hover:bg-pink-50 cursor-pointer'}
                        `}
                        onClick={() => !previewUrl && fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileSelect}
                        />

                        {previewUrl ? (
                            <div className="relative w-full h-full flex flex-col items-center">
                                <img src={previewUrl} alt="Uploaded Poster" className="w-full rounded-xl shadow-lg mb-4 object-contain max-h-[500px]" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setResult(null); }}
                                    className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-black transition"
                                >
                                    Upload Different Image
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-700">Drop a Poster Here</p>
                                    <p className="text-sm text-gray-400">or click to browse</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Analyzing State */}
                    {isAnalyzing && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-pink-500 animate-pulse">
                            <div className="flex items-center gap-4">
                                <svg className="animate-spin h-8 w-8 text-pink-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <div>
                                    <h3 className="font-bold text-gray-800">Analyzing Vibes...</h3>
                                    <p className="text-sm text-gray-500">Extracting colors, text & generating backgrounds</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Results */}
                <div className="lg:col-span-8 space-y-8">
                    {result && (
                        <>
                            {/* 1. Design DNA */}
                            <section className="bg-white rounded-3xl p-8 shadow-lg">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    🧬 Design DNA
                                </h3>
                                
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Style Description */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Visual Style</h4>
                                        <p className="text-gray-700 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            {result.design_style}
                                        </p>
                                    </div>
                                    
                                    {/* Color Palette */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Palette</h4>
                                        <div className="flex h-16 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                            {result.color_palette.map((color, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="flex-1 flex items-end justify-center pb-2 text-[10px] font-mono text-white/80 transition hover:flex-[1.5]"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    <span className="bg-black/20 px-1 rounded backdrop-blur-sm">{color}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 2. Copy Suggestions */}
                            <section className="bg-white rounded-3xl p-8 shadow-lg">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    ✍️ Copywriting Ideas
                                </h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {result.copy_suggestions.map((copy, idx) => (
                                        <div key={idx} className="bg-pink-50 p-5 rounded-2xl border border-pink-100 hover:shadow-md transition">
                                            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-pink-500 font-bold text-sm mb-3 shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <h4 className="font-bold text-gray-800 mb-2">{copy.title}</h4>
                                            <p className="text-sm text-gray-500">{copy.subtitle}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 3. Generated Backgrounds */}
                            <section className="bg-gray-900 rounded-3xl p-8 shadow-xl text-white">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-pink-400">
                                    ✨ Generated Backgrounds
                                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full border border-pink-500/30">Text-Free</span>
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {result.generated_backgrounds.map((bg, idx) => {
                                        const isRegenerating = regeneratingIndices.has(idx);
                                        return (
                                            <div key={idx} className="group relative aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/10">
                                                {isRegenerating ? (
                                                     <div className="w-full h-full flex items-center justify-center bg-gray-900/50">
                                                        <svg className="animate-spin h-8 w-8 text-pink-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                     </div>
                                                ) : (
                                                    <>
                                                        <img 
                                                            src={bg.url} 
                                                            alt={`Generated Background ${idx}`} 
                                                            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                                                            onClick={() => setZoomedImage(bg.url)}
                                                        />
                                                        {/* Style Label Badge */}
                                                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-white/20">
                                                            {bg.style_label}
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {/* Hover Overlay Controls */}
                                                {!isRegenerating && (
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-[1px] px-2">
                                                        {/* Magic Transfer Button */}
                                                        <button
                                                            onClick={() => openMagicStudio(bg.url)}
                                                            className="bg-pink-500 hover:bg-pink-400 text-white px-3 py-2 rounded-full font-bold shadow-lg transition flex items-center gap-1 transform hover:scale-105"
                                                            title="Magic Text Transfer"
                                                        >
                                                            <span className="text-lg">✨</span>
                                                            <span className="text-xs">Edit Text</span>
                                                        </button>
                                                        
                                                        {/* Small Actions */}
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleRegenerateBackground(idx, bg.prompt)}
                                                                className="bg-white/20 hover:bg-white text-white hover:text-pink-600 w-8 h-8 rounded-full flex items-center justify-center transition"
                                                                title="Regenerate"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(bg.url, idx)}
                                                                className="bg-white/20 hover:bg-white text-white hover:text-gray-900 w-8 h-8 rounded-full flex items-center justify-center transition"
                                                                title="Download"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            {/* Magic Poster Studio Modal */}
            {studioData && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[95vh] md:h-[85vh]">
                        
                        {/* Editor Sidebar */}
                        <div className="md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 flex flex-col gap-6 overflow-y-auto">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-1">
                                    ✨ Magic Studio
                                </h3>
                                <p className="text-xs text-gray-500">Fine-tune your poster design!</p>
                            </div>

                            <div className="space-y-6 flex-grow">
                                {/* Headline Controls */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-pink-500 uppercase">Headline</label>
                                    <textarea 
                                        value={studioData.headline}
                                        onChange={(e) => setStudioData({...studioData, headline: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent font-bold text-gray-800 text-sm"
                                        rows={2}
                                        placeholder="Enter headline..."
                                    />
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Pos Y</span>
                                                    <span>{studioData.headlineY}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="10" max="90" step="1"
                                                    value={studioData.headlineY}
                                                    onChange={(e) => setStudioData({...studioData, headlineY: parseFloat(e.target.value)})}
                                                    className="w-full accent-pink-500"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Pos X</span>
                                                    <span>{studioData.headlineX}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="100" step="1"
                                                    value={studioData.headlineX}
                                                    onChange={(e) => setStudioData({...studioData, headlineX: parseFloat(e.target.value)})}
                                                    className="w-full accent-pink-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Size</span>
                                                <span>{studioData.headlineSize}%</span>
                                            </div>
                                            <input 
                                                type="range" min="2" max="20" step="0.5"
                                                value={studioData.headlineSize}
                                                onChange={(e) => setStudioData({...studioData, headlineSize: parseFloat(e.target.value)})}
                                                className="w-full accent-pink-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Subtext Controls */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-pink-500 uppercase">Subtext</label>
                                    <textarea 
                                        value={studioData.subtext}
                                        onChange={(e) => setStudioData({...studioData, subtext: e.target.value})}
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm text-gray-600"
                                        rows={2}
                                        placeholder="Enter details..."
                                    />
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Pos Y</span>
                                                    <span>{studioData.subtextY}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="10" max="90" step="1"
                                                    value={studioData.subtextY}
                                                    onChange={(e) => setStudioData({...studioData, subtextY: parseFloat(e.target.value)})}
                                                    className="w-full accent-pink-500"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Pos X</span>
                                                    <span>{studioData.subtextX}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="0" max="100" step="1"
                                                    value={studioData.subtextX}
                                                    onChange={(e) => setStudioData({...studioData, subtextX: parseFloat(e.target.value)})}
                                                    className="w-full accent-pink-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Size</span>
                                                <span>{studioData.subtextSize}%</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="10" step="0.5"
                                                value={studioData.subtextSize}
                                                onChange={(e) => setStudioData({...studioData, subtextSize: parseFloat(e.target.value)})}
                                                className="w-full accent-pink-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Color & Alignment */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Appearance</label>
                                        <div className="flex bg-gray-200 rounded-lg p-0.5">
                                            <button 
                                                onClick={() => setStudioData({...studioData, textAlign: 'left'})}
                                                className={`p-1 rounded-md transition ${studioData.textAlign === 'left' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h7"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => setStudioData({...studioData, textAlign: 'center'})}
                                                className={`p-1 rounded-md transition ${studioData.textAlign === 'center' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => setStudioData({...studioData, textAlign: 'right'})}
                                                className={`p-1 rounded-md transition ${studioData.textAlign === 'right' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M13 18h7"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-gray-500">Shadow</span>
                                        <button 
                                            onClick={() => setStudioData({...studioData, showShadow: !studioData.showShadow})}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${studioData.showShadow ? 'bg-pink-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${studioData.showShadow ? 'left-4.5' : 'left-0.5'}`} style={{ left: studioData.showShadow ? '18px' : '2px' }} />
                                        </button>
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        {['#000000', '#FFFFFF', '#F472B6', '#34D399', '#8B5CF6', '#FBBF24', '#1F2937', '#DC2626'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setStudioData({...studioData, textColor: c})}
                                                className={`w-8 h-8 rounded-full border-2 transition shadow-sm ${studioData.textColor === c ? 'border-gray-900 scale-110' : 'border-gray-200'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                                <button 
                                    onClick={handleDownloadPoster}
                                    className="bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition shadow-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download Final Poster
                                </button>
                                <button 
                                    onClick={() => setStudioData(null)}
                                    className="text-gray-500 py-3 font-bold hover:text-gray-800 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="md:w-2/3 bg-gray-200 flex items-center justify-center p-8 relative overflow-hidden">
                            <div className="shadow-2xl rounded-sm max-h-full max-w-full flex items-center justify-center">
                                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom Modal */}
            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition"
                        onClick={() => setZoomedImage(null)}
                    >
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <img 
                        src={zoomedImage} 
                        alt="Zoomed Preview" 
                        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
    );
};

export default TrendAnalyzerView;
