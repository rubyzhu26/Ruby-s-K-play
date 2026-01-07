
import React, { useState, useEffect } from 'react';
import TabButton from './components/TabButton';
import InputArea from './components/InputArea';
import ImageAssistantView from './components/ImageAssistantView';
import DictionaryView from './components/DictionaryView';
import VocabularyView from './components/VocabularyView';
import LuckyModal from './components/LuckyModal';
import TrendAnalyzerView from './components/TrendAnalyzerView';
import { AppMode, ImageAssistantResult, DictionaryResult, LuckyResult, SavedWord } from './types';
import { generateImageAssistantData, generateDictionaryData, generateLuckyContent } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('image-assistant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track current search query
  const [currentQuery, setCurrentQuery] = useState('');

  // Results state
  const [imgResult, setImgResult] = useState<ImageAssistantResult | null>(null);
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  
  // Lucky State
  const [luckyResult, setLuckyResult] = useState<LuckyResult | null>(null);
  const [isLuckyLoading, setIsLuckyLoading] = useState(false);

  // Vocabulary State
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [showVocabSidebar, setShowVocabSidebar] = useState(false);

  // Load saved words from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ruby-k-vocab');
    if (saved) {
        try {
            setSavedWords(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load vocabulary", e);
        }
    }
  }, []);

  // Persist saved words whenever they change
  useEffect(() => {
    localStorage.setItem('ruby-k-vocab', JSON.stringify(savedWords));
  }, [savedWords]);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    
    // Clear previous results to avoid confusion
    if (mode === 'image-assistant') setImgResult(null);
    else if (mode === 'dictionary') setDictResult(null);

    try {
      if (mode === 'image-assistant') {
        const data = await generateImageAssistantData(query);
        setImgResult(data);
      } else {
        const data = await generateDictionaryData(query);
        setDictResult(data);
        // Switch to dictionary mode if we search while in vocab mode
        if (mode === 'vocabulary') setMode('dictionary');
      }
    } catch (e: any) {
      console.error(e);
      setError("Sorry, our K-AI friend took a coffee break. Please try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLuckyClick = async () => {
    setIsLuckyLoading(true);
    setError(null);
    try {
        const data = await generateLuckyContent();
        setLuckyResult(data);
    } catch (e) {
        console.error(e);
        setError("Luck wasn't on our side this time. Try again!");
    } finally {
        setIsLuckyLoading(false);
    }
  };

  const switchMode = (newMode: AppMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSaveWord = (word: SavedWord) => {
     setSavedWords(prev => {
         // Check if word already exists (by target string)
         if (prev.some(w => w.target === word.target)) return prev;
         return [word, ...prev];
     });
     alert(`"${word.target}" added to your Vocabulary! 📒`);
  };

  const handleDeleteWord = (id: string) => {
     setSavedWords(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden flex flex-col font-sans">
      
      {/* Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="blob bg-k-purple rounded-full w-[500px] h-[500px] top-[-100px] left-[-100px] mix-blend-multiply opacity-20"></div>
          <div className="blob bg-k-mint rounded-full w-[400px] h-[400px] bottom-[-50px] right-[-50px] mix-blend-multiply opacity-20 animation-delay-2000"></div>
          <div className="blob bg-k-pink rounded-full w-[300px] h-[300px] top-[40%] left-[60%] mix-blend-multiply opacity-20 animation-delay-4000"></div>
      </div>

      {/* Vocabulary Sidebar Toggle (Floating Button) */}
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
          <button 
            onClick={() => switchMode('vocabulary')}
            className={`
                flex items-center gap-2 pl-4 pr-3 py-4 rounded-l-2xl shadow-xl transition-all duration-300
                ${mode === 'vocabulary' 
                    ? 'bg-k-mint text-white translate-x-2' 
                    : 'bg-white text-gray-500 hover:text-k-purple hover:pl-6 translate-x-1'}
            `}
            title="My Vocabulary Notebook"
          >
              <div className="flex flex-col items-center gap-1">
                 <span className="text-xl">📒</span>
                 <span className="writing-mode-vertical text-xs font-bold tracking-widest uppercase">My Vocab</span>
              </div>
          </button>
      </div>

      {/* Header / Nav */}
      <header className="relative z-10 pt-10 pb-6 text-center flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            {/* Rabbit Logo */}
            <div 
                className="text-k-mint cursor-pointer hover:animate-wiggle hover:text-k-purple transition-colors duration-300"
                onClick={() => switchMode('image-assistant')}
            >
                <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M8.5 2C7.1 2 6 3.1 6 4.5V9C3.8 10.3 2 13 2 16C2 19.9 5.6 23 10 23H14C18.4 23 22 19.9 22 16C22 13 20.2 10.3 18 9V4.5C18 3.1 16.9 2 15.5 2C14.1 2 13 3.1 13 4.5V8C12.7 8 12.3 8 12 8C11.7 8 11.3 8 11 8V4.5C11 3.1 9.9 2 8.5 2Z" />
                </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-2 md:gap-3">
              <span className="text-gray-700">Ruby's</span>
              <span className="text-k-purple">K-Play</span>
              <span className="text-k-pink">Palette</span>
            </h1>
        </div>
        <p className="text-gray-500 font-medium mb-8">Design & Learn with AI Magic ✨</p>

        {mode !== 'vocabulary' && (
            <div className="flex justify-center gap-6 mb-8 flex-wrap">
                <TabButton 
                    label="Image & Copy" 
                    isActive={mode === 'image-assistant'} 
                    onClick={() => switchMode('image-assistant')}
                    icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    }
                />
                <TabButton 
                    label="K-Dict" 
                    isActive={mode === 'dictionary'} 
                    onClick={() => switchMode('dictionary')}
                    icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    }
                />
                <TabButton 
                    label="Trend Scout" 
                    isActive={mode === 'trend-analyzer'} 
                    onClick={() => switchMode('trend-analyzer')}
                    icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    }
                />
            </div>
        )}

        {mode !== 'vocabulary' && mode !== 'trend-analyzer' && (
            <div className="container mx-auto px-4 relative z-20 flex flex-col items-center gap-6">
                <InputArea 
                    onSearch={handleSearch} 
                    isLoading={isLoading} 
                    placeholder={mode === 'image-assistant' ? "E.g., Spring Picnic, Han River Night" : "E.g., Hello, Delicious, I love you"}
                    buttonColor={mode === 'image-assistant' ? 'bg-k-purple' : 'bg-k-pink'}
                />
                
                <button
                    onClick={handleLuckyClick}
                    disabled={isLuckyLoading || isLoading}
                    className="group relative bg-white border border-gray-200 text-gray-500 hover:text-k-purple hover:border-k-purple px-6 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 text-sm font-bold disabled:opacity-50"
                >
                    {isLuckyLoading ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-k-purple group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                    )}
                    I'm feeling lucky
                </button>
            </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 pb-12 relative z-10 max-w-6xl">
        {error && (
            <div className="bg-red-100 border border-red-200 text-red-600 px-6 py-4 rounded-xl text-center max-w-xl mx-auto mt-8 animate-fade-in">
                {error}
            </div>
        )}

        {/* Empty State / Intro */}
        {!imgResult && !dictResult && mode === 'image-assistant' && !isLoading && !error && (
            <div className="text-center mt-20 opacity-60">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <p className="text-xl text-gray-400">Type something to start the magic!</p>
            </div>
        )}

        <div className="mt-8">
            {mode === 'image-assistant' && <ImageAssistantView data={imgResult} searchQuery={currentQuery} />}
            {mode === 'dictionary' && (
                <DictionaryView 
                    data={dictResult} 
                    onSave={handleSaveWord}
                    savedIds={new Set(savedWords.map(w => w.target))}
                />
            )}
            {mode === 'trend-analyzer' && <TrendAnalyzerView />}
            {mode === 'vocabulary' && (
                <div className="relative">
                     <button 
                        onClick={() => switchMode('dictionary')}
                        className="mb-6 flex items-center text-gray-400 hover:text-k-purple transition font-bold"
                     >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to Search
                     </button>
                     <VocabularyView savedWords={savedWords} onDelete={handleDeleteWord} />
                </div>
            )}
        </div>
      </main>

      {/* Lucky Modal */}
      {luckyResult && (
          <LuckyModal 
            data={luckyResult} 
            onClose={() => setLuckyResult(null)} 
          />
      )}

      <footer className="text-center py-6 text-gray-400 text-sm relative z-10">
        <p>© 2024 Ruby's K-Play Palette. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
