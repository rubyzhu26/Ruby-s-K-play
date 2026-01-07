import React, { useState } from 'react';
import { SavedWord } from '../types';
import { generateSpeech, generateVocabularyStory } from '../services/geminiService';

interface Props {
  savedWords: SavedWord[];
  onDelete: (id: string) => void;
}

const VocabularyView: React.FC<Props> = ({ savedWords, onDelete }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const handlePlayAudio = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    if (playingId) return;
    setPlayingId(id);

    try {
        const base64Audio = await generateSpeech(text);
        
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
        source.onended = () => setPlayingId(null);
    } catch (e) {
        console.error("Audio failed", e);
        setPlayingId(null);
    }
  };

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleGenerateStory = async () => {
    if (savedWords.length === 0 || isGeneratingStory) return;
    setIsGeneratingStory(true);
    setStory(null);
    try {
        const words = savedWords.map(w => w.target);
        const storyText = await generateVocabularyStory(words);
        setStory(storyText);
    } catch (e) {
        console.error(e);
        alert("Story generation failed.");
    } finally {
        setIsGeneratingStory(false);
    }
  };

  if (savedWords.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 animate-fade-in">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-600 mb-2">My Vocabulary is Empty</h2>
            <p className="text-gray-400">Go to K-Dict and save some words to start your collection!</p>
        </div>
    );
  }

  return (
    <div className="pb-20 animate-fade-in space-y-12">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-3xl shadow-lg border-b-4 border-k-mint">
            <div>
                <h2 className="text-3xl font-black text-k-dark flex items-center gap-3">
                    <span className="text-k-mint">📒</span> My Vocabulary
                </h2>
                <p className="text-gray-500 mt-2">You have collected <span className="font-bold text-k-purple">{savedWords.length}</span> words.</p>
            </div>
            <button
                onClick={handleGenerateStory}
                disabled={isGeneratingStory}
                className="bg-k-purple text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
                {isGeneratingStory ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                )}
                Generate AI Story
            </button>
        </div>

        {/* AI Story Section */}
        {story && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-k-purple/20 shadow-inner animate-fade-in-up">
                <h3 className="text-xl font-bold text-k-purple mb-4 flex items-center gap-2">
                    ✨ A Story Just for You
                </h3>
                <div className="prose prose-purple max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {story}
                </div>
            </div>
        )}

        {/* Flashcards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedWords.map((word) => {
                const isFlipped = flippedCards.has(word.id);
                
                return (
                    <div 
                        key={word.id}
                        onClick={() => toggleFlip(word.id)}
                        className={`
                            relative h-[450px] cursor-pointer transition-all duration-300
                            rounded-3xl shadow-xl overflow-hidden border-4 border-white
                            hover:shadow-2xl hover:scale-[1.02]
                            ${isFlipped ? 'bg-k-bg ring-4 ring-k-mint/20' : 'bg-white ring-4 ring-transparent'}
                        `}
                    >
                        {!isFlipped ? (
                            // FRONT (Image + Word)
                            <div className="flex flex-col h-full animate-fade-in">
                                <div className="h-[60%] bg-gray-100 relative overflow-hidden">
                                     {word.image_url ? (
                                        <img src={word.image_url} alt={word.target} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 flex-col gap-2">
                                            <span className="text-xs">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-black/20 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md">
                                        Tap to Flip
                                    </div>
                                </div>
                                <div className="h-[40%] flex flex-col items-center justify-center p-6 gap-3">
                                    <h3 className="text-4xl font-black text-k-purple">{word.target}</h3>
                                    <button
                                        onClick={(e) => handlePlayAudio(e, word.target, `vocab-${word.id}-main`)}
                                        className={`
                                            w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md
                                            ${playingId === `vocab-${word.id}-main` ? 'bg-k-mint text-white animate-pulse' : 'bg-gray-100 text-k-purple hover:bg-k-purple hover:text-white'}
                                        `}
                                    >
                                        {playingId === `vocab-${word.id}-main` ? (
                                             <div className="flex gap-1 items-center justify-center h-4">
                                                <div className="w-1 h-2 bg-white animate-bounce"></div>
                                                <div className="w-1 h-3 bg-white animate-bounce animation-delay-100"></div>
                                                <div className="w-1 h-2 bg-white animate-bounce animation-delay-200"></div>
                                            </div>
                                        ) : (
                                            <svg className="w-6 h-6 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // BACK (Meaning + Examples)
                            <div className="flex flex-col h-full p-6 animate-fade-in bg-gray-50">
                                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Meaning</span>
                                        <h3 className="text-2xl font-black text-gray-800 mt-1">{word.cn_meaning}</h3>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(word.id); }}
                                        className="text-gray-300 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                                        title="Remove Word"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-gray-300">
                                    {word.examples.map((ex, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <p className="font-bold text-k-purple text-sm leading-snug">{ex.sentence}</p>
                                                <button
                                                    onClick={(e) => handlePlayAudio(e, ex.sentence, `vocab-${word.id}-ex-${idx}`)}
                                                    className={`
                                                        shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all
                                                        ${playingId === `vocab-${word.id}-ex-${idx}` ? 'bg-k-mint text-white' : 'text-gray-400 hover:bg-k-mint hover:text-white bg-gray-50'}
                                                    `}
                                                >
                                                    <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </button>
                                            </div>
                                            <p className="text-gray-500 text-xs">{ex.cn}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center mt-3 pt-2 text-k-mint font-bold text-xs uppercase">Tap to Flip Back</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default VocabularyView;