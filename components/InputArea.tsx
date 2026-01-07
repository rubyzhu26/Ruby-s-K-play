import React, { useState } from 'react';

interface InputAreaProps {
  onSearch: (query: string) => void;
  placeholder: string;
  isLoading: boolean;
  buttonColor?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ onSearch, placeholder, isLoading, buttonColor = 'bg-k-purple' }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-k-purple to-k-mint rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative flex items-center bg-white rounded-full shadow-xl p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-grow bg-transparent px-6 py-3 text-lg text-gray-700 placeholder-gray-400 focus:outline-none rounded-full"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`
            ${buttonColor} text-white rounded-full px-8 py-3 font-bold text-lg
            transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-md flex items-center gap-2
          `}
        >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <span>GO!</span>
            )}
        </button>
      </div>
    </form>
  );
};

export default InputArea;