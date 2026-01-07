
import React, { useState, useEffect, useRef } from 'react';
import { DictionaryResult, SavedWord } from '../types';
import { generateVisualImage, generateSpeech, createDictionaryChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface Props {
  data: DictionaryResult | null;
  onSave: (word: SavedWord) => void;
  savedIds: Set<string>;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const DictionaryView: React.FC<Props> = ({ data, onSave, savedIds }) => {
    const [conceptImage, setConceptImage] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

    // Chat State
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Automatically generate the concept image when data loads
        if (data) {
            // 1. Image Generation
            if (data.concept_art_prompt) {
                setLoadingImage(true);
                setConceptImage(null);
                generateVisualImage(data.concept_art_prompt)
                    .then(setConceptImage)
                    .catch(err => console.error("Concept art generation failed", err))
                    .finally(() => setLoadingImage(false));
            }

            // 2. Chat Initialization
            const session = createDictionaryChatSession(data.basics.target);
            setChatSession(session);
            // Use the usage_guide from the initial result as the first message from the bot
            setMessages([{ role: 'model', text: data.usage_guide }]);
        }
    }, [data]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chatSession) return;

        const userMsg = chatInput;
        setChatInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatLoading(true);

        try {
            const result: GenerateContentResponse = await chatSession.sendMessage({ message: userMsg });
            const botText = result.text;
            if (botText) {
                setMessages(prev => [...prev, { role: 'model', text: botText }]);
            }
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I got disconnected! 😓 Try asking again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handlePlayAudio = async (text: string, id: string) => {
        if (playingAudioId) return; // Prevent overlapping audio
        setPlayingAudioId(id);

        try {
            const base64Audio = await generateSpeech(text);
            
            // Decode logic
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
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

            source.onended = () => {
                setPlayingAudioId(null);
            };
        } catch (e) {
            console.error("Audio playback failed", e);
            setPlayingAudioId(null);
            alert("Audio playback failed. Please try again.");
        }
    };

    const handleSave = () => {
        if (!data) return;
        const newWord: SavedWord = {
            id: Date.now().toString(),
            target: data.basics.target,
            cn_meaning: data.basics.cn_meaning,
            examples: data.examples,
            image_url: conceptImage,
            date: Date.now()
        };
        onSave(newWord);
    };

  if (!data) return null;

  const isSaved = Array.from(savedIds).some(id => false); // Simplified check, logic handled by parent if needed, but here we just animate
  // Actual check needs to compare target words, but for now we just use the save handler

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      
      {/* Top Row: Info & Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT: Basics & Examples */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* A. BASICS */}
            <section className="bg-white rounded-3xl p-8 shadow-lg border-l-8 border-k-purple relative">
              <span className="text-gray-400 text-sm font-bold tracking-widest uppercase mb-2 block">Word of the Day</span>
              
              {/* SAVE BUTTON */}
              <button 
                onClick={handleSave}
                className="absolute top-8 right-8 bg-gray-100 hover:bg-k-pink hover:text-white text-gray-400 p-3 rounded-2xl transition-all shadow-sm group"
                title="Save to My Vocabulary"
              >
                  <div className="flex flex-col items-center">
                    {/* Rabbit + Book Icon */}
                    <svg className="w-8 h-8 group-hover:animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 4a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" className="text-k-purple" stroke="none" /> 
                    </svg>
                    <span className="text-[10px] font-bold mt-1">SAVE</span>
                  </div>
              </button>

              <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-5xl font-extrabold text-k-purple tracking-tight">
                    {data.basics.target}
                  </h1>
                  <button 
                      onClick={() => handlePlayAudio(data.basics.target, 'main-word')}
                      disabled={!!playingAudioId}
                      className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-all
                          ${playingAudioId === 'main-word' ? 'bg-k-purple text-white animate-pulse' : 'bg-gray-100 text-k-purple hover:bg-k-purple hover:text-white'}
                      `}
                      title="Listen to pronunciation"
                  >
                      {playingAudioId === 'main-word' ? (
                          <div className="flex gap-1 items-center justify-center h-4">
                              <div className="w-1 h-2 bg-white animate-bounce"></div>
                              <div className="w-1 h-3 bg-white animate-bounce animation-delay-100"></div>
                              <div className="w-1 h-2 bg-white animate-bounce animation-delay-200"></div>
                          </div>
                      ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                      )}
                  </button>
              </div>
              <p className="text-2xl text-gray-600 font-medium">
                {data.basics.cn_meaning}
              </p>
            </section>

            {/* B. EXAMPLES */}
            <section className="bg-white rounded-3xl p-8 shadow-lg flex-grow flex flex-col justify-center">
               <h3 className="text-xl font-bold text-k-dark mb-4 flex items-center gap-2">
                 📚 Examples
               </h3>
               <div className="space-y-4">
                 {data.examples.map((ex, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-k-purple/30 transition group">
                       <div className="flex justify-between items-start gap-3">
                            <p className="text-lg font-bold text-gray-800 mb-1 leading-snug">{ex.sentence}</p>
                            <button 
                                onClick={() => handlePlayAudio(ex.sentence, `ex-${idx}`)}
                                disabled={!!playingAudioId}
                                className={`
                                    shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all
                                    ${playingAudioId === `ex-${idx}` ? 'bg-k-purple text-white' : 'text-gray-400 hover:bg-k-purple hover:text-white bg-white shadow-sm'}
                                `}
                                title="Listen"
                            >
                                {playingAudioId === `ex-${idx}` ? (
                                    <span className="flex gap-0.5 h-3 items-center">
                                        <span className="w-0.5 h-2 bg-white animate-pulse"></span>
                                        <span className="w-0.5 h-3 bg-white animate-pulse delay-75"></span>
                                        <span className="w-0.5 h-2 bg-white animate-pulse delay-150"></span>
                                    </span>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                                )}
                            </button>
                       </div>
                       <p className="text-gray-500">{ex.cn}</p>
                    </div>
                 ))}
               </div>
            </section>
          </div>

          {/* RIGHT: Visual Concept */}
          <div className="md:col-span-5 flex flex-col">
             
             {/* CONCEPT ART */}
             <section className="bg-white rounded-3xl p-6 shadow-xl h-full flex flex-col">
                <h3 className="text-xl font-bold text-k-pink mb-4 flex items-center gap-2">
                    🎨 Concept Art
                </h3>
                
                <div className="bg-gray-100 rounded-2xl overflow-hidden relative flex-grow min-h-[300px] border-4 border-dashed border-gray-200 flex items-center justify-center">
                     {loadingImage ? (
                         <div className="flex flex-col items-center gap-4 text-k-purple">
                            <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="font-bold text-sm">Sketching healing vibes...</p>
                         </div>
                     ) : conceptImage ? (
                         <img src={conceptImage} alt="Concept Art" className="w-full h-full object-cover" />
                     ) : (
                         <div className="text-gray-400 text-center p-4">
                             Concept visualization failed to load.
                         </div>
                     )}
                </div>
             </section>
          </div>
      </div>

      {/* Bottom Row: K-CHAT GUIDE (Full Width) */}
      <section className="bg-gradient-to-br from-k-purple to-indigo-600 rounded-3xl p-1 shadow-xl text-white relative overflow-hidden flex flex-col h-[500px]">
        {/* Header */}
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-t-2xl flex items-center gap-3 border-b border-white/10 z-20">
            <div className="w-10 h-10 bg-k-mint rounded-full flex items-center justify-center text-k-dark font-bold text-xl">
                K
            </div>
            <div>
                <h3 className="font-bold text-lg">K-Chat Practice</h3>
                <p className="text-xs text-indigo-100 opacity-80">Chat with Ruby's Tutor to practice using "{data.basics.target}"!</p>
            </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4 z-20 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                        max-w-[85%] rounded-2xl px-6 py-3 text-base leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                            ? 'bg-white text-k-purple rounded-br-none' 
                            : 'bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-bl-none'}
                    `}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isChatLoading && (
                <div className="flex justify-start">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl rounded-bl-none px-6 py-4 flex gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/20 backdrop-blur-md rounded-b-2xl z-20">
            <form onSubmit={handleSendMessage} className="flex gap-3 relative max-w-4xl mx-auto">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入中文问题，开始练习..."
                    className="flex-grow bg-white/90 text-gray-800 placeholder-gray-500 rounded-full px-6 py-4 focus:outline-none focus:ring-4 focus:ring-k-mint/50 border-none shadow-lg text-base"
                />
                <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="bg-k-mint text-k-dark font-bold rounded-full w-14 h-14 flex items-center justify-center hover:bg-white hover:text-k-purple transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                >
                    <svg className="w-6 h-6 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
            </form>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-k-pink rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse z-0"></div>
        <div className="absolute bottom-10 -left-10 w-40 h-40 bg-indigo-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30 z-0"></div>
      </section>
    </div>
  );
};

export default DictionaryView;
