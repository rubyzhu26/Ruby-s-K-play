
import React, { useState, useEffect } from 'react';
import { ImageAssistantResult, ImagePromptModules } from '../types';
import { generateVisualImage, regenerateImagePrompts } from '../services/geminiService';

interface Props {
  data: ImageAssistantResult | null;
  searchQuery: string;
}

// 1. Define Art Styles
const ART_STYLES = [
  { id: 'felt', name: '🧸 Felt Art', prompt: 'Core: High-Quality Needle Felting Art style. Texture: Realistic soft wool fuzz, tactile and warm, like a high-quality plush toy. Aesthetics: Cute, Soft, Rounded shapes. Vibe: Cozy, Playful, Hand-crafted feel.' },
  { id: 'oil_pastel', name: '🖍️ Oil Pastel', prompt: 'Core: Oil Pastel Drawing style. Rendering: Heavy, textured oil pastel strokes, rich impasto effect. Colors: Highly saturated, deep and vibrant colors (Deep Blue, Crimson, Golden Yellow, Emerald Green). Aesthetics: Expressive, bold, warm and tactile texture. Vibe: Artistic, energetic, slightly abstract.' },
  { id: 'vibrant_draw', name: '🎨 Vibrant Draw', prompt: 'Core: Hand-drawn Children\'s Book Illustration. Rendering: Rich Colored Pencil or Crayon texture. Colors: Fresh and Clear tones, slightly more saturated than pale pastels but NOT neon. (e.g., Salmon Pink, Grass Green, Sky Blue, Warm Yellow). Vibe: Cheerful, Distinct, yet Gentle.' },
  { id: 'handdrawn', name: '🖍️ Soft Sketch', prompt: 'Core: Hand-drawn Children\'s Book Illustration style. Rendering: Colored pencil or soft Crayon texture, gentle strokes. Vibe: Healing, Nostalgic, Pure and Innocent. Aesthetics: Cute characters, soft pastel tones, storybook feel.' },
  { id: 'ghibli', name: '🍃 Ghibli', prompt: 'Core: Studio Ghibli Hayao Miyazaki style. Rendering: Watercolor texture, lush green and blue tones, soft lighting. Vibe: Peaceful, Healing, Fresh and Natural atmosphere.' },
  { id: 'monet', name: '🎨 Monet', prompt: 'Core: Impressionist Oil Painting style like Claude Monet. Rendering: Visible brush strokes, light pastel colors, dreamy atmosphere, soft focus.' },
  { id: 'bauhaus', name: '🧱 Bauhaus', prompt: 'Core: Bauhaus Design Style. Rendering: Geometric shapes, clean lines, primary colors (Red, Blue, Yellow), minimalist, abstract composition.' },
];

// 2. Define Compositions
const COMPOSITIONS = [
  { id: 'default', name: '✨ Auto', prompt: '' },
  { id: 'frame', name: '🖼️ Frame', prompt: 'Layout: Create a decorative border frame along the four edges. The entire center area MUST be completely empty/blank (negative space) to serve as a writing area.' },
  { id: 'corners', name: '📐 Corners', prompt: 'Layout: Subject elements arranged strictly in the four corners of the image. The elements should be small and delicate, connected by thin, subtle lines or borders. The entire central area must be completely open and empty negative space.' },
  { id: 'bottom', name: '⬇️ Bottom', prompt: 'Layout: Subject elements concentrated strictly at the bottom, leaving the top 80% empty as negative space.' },
  { id: 'top', name: '⬆️ Top', prompt: 'Layout: Subject elements concentrated strictly at the top, leaving the bottom 80% empty as negative space.' },
  { id: 'giant', name: '💥 Giant', prompt: 'Layout: A MASSIVE, exaggerated subject (e.g., giant tree, tower) placed vertically in the dead CENTER. The subject splits the negative space into Left and Right sides. Text area is on the sides.' },
  { id: 'viral', name: '🔥 Viral', prompt: 'Layout: Viral Marketing Poster Style. A MASSIVE, COMPLETELY BLANK Central Message Panel (white or light color) occupying 70% of the image. Decorations (3D cute mascots) strictly on the extreme edges peeking in. Color: Unified Warm Tones (Red/Orange/Gold). ABSOLUTELY NO TEXT in the center.' },
];

interface BatchImage {
    id: number;
    title: string;
    description: string;
    url: string | null;
    prompt: string;
}

const ImageAssistantView: React.FC<Props> = ({ data, searchQuery }) => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  
  // Selectors State - Default to 'felt' since 'default' K-Vibe is removed
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].id);
  const [selectedComposition, setSelectedComposition] = useState('default');
  
  // State for active prompts/motion info
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [activePromptModules, setActivePromptModules] = useState<ImagePromptModules>(data?.prompt_modules || { core: '', subject: '', rendering: '', aesthetics: '', layout: '' });

  // Batch Test State
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  
  useEffect(() => {
    if (data) {
        setGeneratedImage(null); // Reset image when new search result comes
        setCurrentPrompt('');
        setBatchImages([]); // Reset batch images
        setActivePromptModules(data.prompt_modules); // Reset to original modules
        setSelectedStyle(ART_STYLES[0].id); // Reset to first style (Felt)
        setSelectedComposition('default');
    }
  }, [data]);

  if (!data) return null;

  const handleGeneratePreview = async (overrideModules?: ImagePromptModules) => {
    if (isGeneratingImg) return;
    setIsGeneratingImg(true);
    
    try {
        const style = ART_STYLES.find(s => s.id === selectedStyle);
        const layout = COMPOSITIONS.find(c => c.id === selectedComposition);

        const modules = overrideModules || activePromptModules;

        // Construct dynamic prompt
        let basePrompt = `1:1 square aspect ratio K-Style advertising background for "${searchQuery}" theme. Large Central Negative Space for text.`;
        
        // Add Style Instructions
        if (style) {
            basePrompt += ` ${style.prompt}`;
        } else {
             // Fallback
             basePrompt += ` Core: ${modules.core}. Subject: ${modules.subject}. Rendering: ${modules.rendering}.`;
        }

        // Add Layout Instructions
        if (layout && layout.id !== 'default') {
             basePrompt += ` ${layout.prompt}`;
        } else {
             // Use active prompt modules
             basePrompt += ` Layout: ${modules.layout}. Aesthetics: ${modules.aesthetics}.`;
        }
        
        // Final cleanup enforcement
        basePrompt += " **IMPORTANT: BACKGROUND MUST BE SIMPLE/PLAIN. NO COMPLEX PATTERNS. CENTER MUST BE EMPTY. ABSOLUTELY NO TEXT.**";

        setCurrentPrompt(basePrompt);

        const imgUrl = await generateVisualImage(basePrompt);
        setGeneratedImage(imgUrl);
    } catch (e) {
        console.error(e);
        alert("Oops! Image generation failed. Try again.");
    } finally {
        setIsGeneratingImg(false);
    }
  };

  const handleNewIdea = async () => {
    if (isGeneratingImg) return;
    setIsGeneratingImg(true); // Show loading state on main image area
    
    try {
        // 1. Fetch new prompt ideas
        const newModules = await regenerateImagePrompts(searchQuery);
        setActivePromptModules(newModules);

        // 2. Reset styles to default so the new idea shines through
        // Since we removed 'default' style, we keep the current selected style or reset to 'felt'
        // Let's reset to 'felt' to be consistent with initial load
        setSelectedStyle(ART_STYLES[0].id);
        setSelectedComposition('default');

        // 3. Generate image immediately
        await handleGeneratePreview(newModules); 
        
    } catch (e) {
        console.error("Failed to generate new idea", e);
        alert("Couldn't brainstorm a new idea right now. Try again!");
        setIsGeneratingImg(false);
    }
  };

  const handleDownload = (url: string, prefix: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `k-vibe-${prefix}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBatchTest = async () => {
      if (isBatchLoading) return;
      setIsBatchLoading(true);

      // Randomize background colors for Felt style to provide rich variety
      const feltColors = [
        "Vibrant Orange",
        "Deep Royal Blue",
        "Rich Emerald Green",
        "Hot Pink",
        "Sunny Yellow",
        "Vivid Purple",
        "Bright Turquoise",
        "Cherry Red"
      ];
      const randomFeltColor = feltColors[Math.floor(Math.random() * feltColors.length)];

      const batchConfigs = [
          {
              id: 1,
              title: "Minimalist Ghibli",
              description: "Healing Watercolor • 80% Space",
              prompt: `1:1 aspect ratio background for "${searchQuery}". Style: Studio Ghibli (Hayao Miyazaki), Watercolor texture, Lush green and blue tones, Soft lighting, Peaceful and Healing atmosphere. Layout: Extreme 80% Central Negative Space (White/Cream). Subject: Minimalist, natural elements (clouds, leaves, flowers) strictly on edges. High quality. Simple Background. ABSOLUTELY NO TEXT.`
          },
          {
              id: 2,
              title: "Rich Color Felt",
              description: `Vibrant Wool • ${randomFeltColor}`,
              prompt: `1:1 aspect ratio background for "${searchQuery}". Style: **High-Quality Needle Felting Art**, **Rich and Saturated Colors**. Texture: **Realistic soft wool fuzz**, tactile and warm. Vibe: Cute, Playful, **Vivid Color Palette**. Layout: **Extreme 80% Central Negative Space**. Background Color: **${randomFeltColor}**. Subject: Cute felted elements strictly on edges/corners. Simple Background. ABSOLUTELY NO TEXT.`
          },
          {
              id: 3,
              title: "Gradient Blend",
              description: "Red/Blue or Orange/Green",
              prompt: `1:1 aspect ratio background for "${searchQuery}". Style: **Modern Color Gradient & Blending**. Palette: **Vivid Red & Blue OR Vibrant Orange & Green**. Aesthetic: **Smooth Color Transitions, Gradient Blends**, Harmonious contrast. Layout: Extreme 80% Central Negative Space (Light gradient tint). Subject: Abstract shapes or decorative elements strictly on edges. Simple Background. ABSOLUTELY NO TEXT.`
          }
      ];

      // Initialize placeholders
      setBatchImages(batchConfigs.map(c => ({ ...c, url: null })));

      try {
          const promises = batchConfigs.map(async (config) => {
              try {
                  const url = await generateVisualImage(config.prompt);
                  return { ...config, url };
              } catch (e) {
                  console.error(`Batch gen failed for ${config.title}`, e);
                  return { ...config, url: null };
              }
          });

          const results = await Promise.all(promises);
          setBatchImages(results);
      } catch (e) {
          console.error(e);
      } finally {
          setIsBatchLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* SECTION 1: KEYWORDS */}
      <section className="bg-white rounded-3xl p-8 shadow-xl border-b-4 border-k-mint">
        <h2 className="text-2xl font-bold text-k-purple mb-6 flex items-center gap-2">
          <span className="bg-k-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
          Search Keywords
          <span className="text-sm font-normal text-gray-400 ml-2">(Naver / Pinterest / IG)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.search_keywords.map((kw, idx) => (
            <div key={idx} className="bg-gray-50 rounded-2xl p-4 text-center hover:bg-k-mint/10 transition cursor-pointer border border-gray-100 hover:border-k-mint">
              <div className="text-xl font-bold text-k-dark mb-1">{kw.kr}</div>
              <div className="text-sm text-gray-500 font-medium">{kw.en}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: VISUAL STYLE */}
      <section className="bg-white rounded-3xl p-8 shadow-xl border-b-4 border-k-pink">
        <h2 className="text-2xl font-bold text-k-pink mb-6 flex items-center gap-2">
          <span className="bg-k-pink text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
          K-Style Visual Summary
        </h2>
        
        <div className="grid md:grid-cols-12 gap-8">
            {/* Colors & Features - Left Side (4 cols) */}
            <div className="md:col-span-4 space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3">🎨 Color Palettes</h3>
                    <div className="space-y-3">
                        {data.visual_style.color_palettes.map((palette, idx) => (
                            <div key={idx} className="flex gap-2 bg-gray-50 p-3 rounded-xl items-center justify-between">
                                {palette.map((color, cIdx) => (
                                    <div key={cIdx} className="group relative">
                                        <div 
                                            className="w-8 h-8 md:w-10 md:h-10 rounded-full shadow-sm border border-gray-200 cursor-pointer transform hover:scale-110 transition"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                                            {color}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3">✨ Features</h3>
                    <div className="flex flex-wrap gap-2">
                        {data.visual_style.illustration_features.map((feature, idx) => (
                            <span key={idx} className="bg-k-pink/10 text-k-pink font-semibold px-3 py-1.5 rounded-full text-sm">
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reference & Preview - Right Side (8 cols) */}
            <div className="md:col-span-8 flex flex-col h-full">
                {/* Controls Area: STYLE & LAYOUT */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-4 border border-gray-100 space-y-4">
                    
                    {/* Art Style Selector */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                            🎨 Art Style
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {ART_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={`
                                        px-3 py-2 rounded-lg text-sm font-bold transition-all border
                                        ${selectedStyle === style.id
                                        ? 'bg-k-purple text-white border-k-purple shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-k-purple/50'}
                                    `}
                                >
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Composition Selector */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                            📐 Composition (Layout)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {COMPOSITIONS.map(comp => (
                                <button
                                    key={comp.id}
                                    onClick={() => setSelectedComposition(comp.id)}
                                    className={`
                                        px-3 py-2 rounded-lg text-sm font-bold transition-all border
                                        ${selectedComposition === comp.id
                                        ? 'bg-k-mint text-white border-k-mint shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-k-mint/50'}
                                    `}
                                >
                                    {comp.name}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Image Area */}
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center">
                        🖼️ Reference Vibe
                    </h3>
                </div>

                <div className="bg-gray-100 rounded-2xl p-1 flex-grow flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group shadow-inner border border-gray-200">
                     {generatedImage ? (
                         <>
                             <div className="relative w-full h-full">
                                <img src={generatedImage} alt="AI Generated Preview" className="w-full h-full object-contain rounded-xl shadow-sm bg-white" />
                             </div>
                             
                             {/* Overlay Controls */}
                             <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300 flex flex-col items-center justify-center gap-4 rounded-xl ${isGeneratingImg ? 'opacity-100 z-20' : 'opacity-0 group-hover:opacity-100 z-10'}`}>
                                
                                {isGeneratingImg ? (
                                     <div className="flex flex-col items-center text-white">
                                        <svg className="animate-spin h-8 w-8 mb-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="font-bold">Designing...</span>
                                     </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {/* Regenerate (Redraw) */}
                                        <button
                                            onClick={() => handleGeneratePreview()}
                                            className="bg-white text-k-dark hover:text-k-purple px-5 py-3 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            title="Redraw with same prompt"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            <span>Redraw</span>
                                        </button>

                                        {/* New Idea */}
                                        <button
                                            onClick={handleNewIdea}
                                            className="bg-k-mint text-white hover:bg-teal-500 px-5 py-3 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            title="Generate a completely new concept"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                            <span>New Idea ✨</span>
                                        </button>

                                        {/* Download - Enhanced Visibility */}
                                        <button
                                            onClick={() => handleDownload(generatedImage, `style-${selectedStyle}`)}
                                            className="bg-white text-gray-700 hover:text-k-purple w-12 h-12 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                                            title="Download Image"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        </button>
                                    </div>
                                )}
                             </div>
                         </>
                     ) : (
                         <div className="text-center p-6 w-full max-w-md">
                            <div className="mb-6 space-y-2">
                                <p className="text-gray-500 text-sm italic">
                                    "{data.visual_style.reference_image_descriptions[0]}"
                                </p>
                            </div>
                            <button 
                                onClick={() => handleGeneratePreview()}
                                disabled={isGeneratingImg}
                                className="bg-k-dark text-white px-8 py-3 rounded-full font-bold hover:bg-black transition flex items-center gap-2 mx-auto disabled:opacity-50 shadow-lg hover:scale-105 transform duration-200"
                            >
                                {isGeneratingImg ? 'Painting...' : 'Generate Preview'}
                            </button>
                         </div>
                     )}
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                   *Select a Style and Layout above, then click Generate.
                </p>
            </div>
        </div>
      </section>

      {/* SECTION 3: PROMPT & MOTION RECIPE */}
      <section className="bg-gray-900 rounded-3xl p-8 shadow-xl text-white border border-gray-800 relative overflow-hidden">
          {/* Header */}
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10 text-k-mint">
              <span className="bg-k-mint text-k-dark w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Prompt & Motion Recipe
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 relative z-10">
              
              {/* Static Image Prompt */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/10 flex flex-col">
                  <h3 className="text-k-pink font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      Static Image Prompt
                  </h3>
                  <div className="flex-grow bg-black/50 rounded-xl p-4 text-sm font-mono text-gray-300 overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-gray-600 leading-relaxed whitespace-pre-wrap">
                      {currentPrompt ? currentPrompt : (
                          <span className="text-gray-600 italic">Generate an image in Section 2 to see the prompt here...</span>
                      )}
                  </div>
              </div>

              {/* Motion & Music */}
              <div className="flex flex-col gap-4">
                   {/* Motion Prompt */}
                   <div className="bg-black/30 rounded-2xl p-6 border border-white/10 flex-grow">
                        <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            Motion Guide
                        </h3>
                         <p className="text-gray-300 leading-relaxed text-sm">
                            {data.motion_guide.visual_movement}
                         </p>
                   </div>
                   
                   {/* Music Vibe */}
                   <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-k-mint font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                             Music Vibe
                        </h3>
                        <p className="text-gray-300 text-sm">
                            {data.motion_guide.music_recommendation}
                        </p>
                   </div>
              </div>
          </div>
      </section>

      {/* SECTION 4: STYLE LAB (BATCH TEST) */}
      <section className="bg-indigo-50 rounded-3xl p-8 shadow-xl border-t-4 border-indigo-400">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                <span className="bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                Style Lab
                <span className="px-3 py-1 bg-indigo-200 text-indigo-700 text-xs rounded-full font-bold uppercase tracking-wider">Batch Test</span>
            </h2>
            <button
                onClick={handleBatchTest}
                disabled={isBatchLoading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
                {isBatchLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Brewing Styles...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        <span>Generate 3 Variations</span>
                    </>
                )}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {batchImages.length === 0 ? (
                // Empty Placeholders
                [1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-indigo-100/50 rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-300 gap-2">
                        <span className="text-4xl font-bold opacity-50">{i}</span>
                        <span className="text-sm">Style Variant</span>
                    </div>
                ))
            ) : (
                batchImages.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-md flex flex-col h-full animate-fade-in-up">
                        {/* Header */}
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>
                                <p className="text-xs text-gray-400">{item.description}</p>
                            </div>
                            {item.url && (
                                <button 
                                    onClick={() => handleDownload(item.url!, `batch-${item.id}`)}
                                    className="text-gray-400 hover:text-indigo-600 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                </button>
                            )}
                        </div>

                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative group">
                            {item.url ? (
                                <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            )}
                        </div>

                        {/* Prompt */}
                        <div className="p-4 bg-gray-50 flex-grow">
                            <p className="text-[10px] text-gray-500 font-mono leading-tight line-clamp-6 hover:line-clamp-none transition-all">
                                {item.prompt}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>
      </section>
    </div>
  );
};

export default ImageAssistantView;
