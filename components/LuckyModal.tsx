
import React, { useEffect, useState } from 'react';
import { LuckyResult } from '../types';
import { generateVisualImage, generateSpeech } from '../services/geminiService';

interface Props {
    data: LuckyResult;
    onClose: () => void;
}

const LuckyModal: React.FC<Props> = ({ data, onClose }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioId, setAudioId] = useState<string | null>(null);
    const [loadingImg, setLoadingImg] = useState(true);

    useEffect(() => {
        let isMounted = true;
        // Generate image immediately upon mounting
        generateVisualImage(data.image_prompt)
            .then(url => {
                if (isMounted) {
                    setImageUrl(url);
                    setLoadingImg(false);
                }
            })
            .catch(e => {
                console.error("Lucky image failed", e);
                if (isMounted) setLoadingImg(false);
            });
            
        return () => { isMounted = false; };
    }, [data.image_prompt]);

    const handlePlayAudio = async () => {
        if (audioId) return;
        setAudioId('playing');
        try {
            const base64Audio = await generateSpeech(data.korean_sentence);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) {
                channelData[i] = dataInt16[i] / 32768.0;
            }
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
            source.onended = () => setAudioId(null);
        } catch (e) {
            console.error(e);
            setAudioId(null);
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (imageUrl) {
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = `k-vibe-lucky-${data.theme.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Modal Card */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border-4 border-white/50 ring-4 ring-k-purple/20">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-md transition"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                {/* Content */}
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center group">
                    {loadingImg ? (
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-k-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-k-purple font-medium animate-pulse">Dreaming up a view...</p>
                        </div>
                    ) : imageUrl ? (
                        <>
                           <img src={imageUrl} alt={data.theme} className="w-full h-full object-cover" />
                           {/* Text Overlay for dramatic effect */}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                           
                           {/* Download Button */}
                           <button
                                onClick={handleDownload}
                                className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 z-30 pointer-events-auto"
                                title="Download Image"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                           </button>
                        </>
                    ) : (
                        <div className="text-gray-400">Image unavailable</div>
                    )}
                </div>

                <div className="p-8 text-center bg-white relative -mt-6 rounded-t-[2rem]">
                    <span className="inline-block px-3 py-1 bg-k-purple/10 text-k-purple text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                        ✨ {data.theme}
                    </span>
                    
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 leading-snug">
                        {data.korean_sentence}
                    </h2>
                    
                    <p className="text-gray-500 mb-6 font-medium">
                        {data.chinese_translation}
                    </p>

                    <button 
                        onClick={handlePlayAudio}
                        disabled={!!audioId}
                        className={`
                            mx-auto flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
                            ${audioId 
                                ? 'bg-k-mint text-white animate-pulse' 
                                : 'bg-k-dark text-white hover:bg-black'}
                        `}
                    >
                         {audioId ? (
                             <>
                                <span className="flex gap-1 h-3 items-center">
                                    <span className="w-1 h-2 bg-white animate-bounce"></span>
                                    <span className="w-1 h-3 bg-white animate-bounce animation-delay-100"></span>
                                    <span className="w-1 h-2 bg-white animate-bounce animation-delay-200"></span>
                                </span>
                                <span>Playing...</span>
                             </>
                         ) : (
                             <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                                <span>Listen</span>
                             </>
                         )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LuckyModal;
