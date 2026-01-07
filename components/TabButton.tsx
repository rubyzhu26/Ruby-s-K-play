
import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 ease-in-out flex items-center gap-3
        ${isActive 
          ? 'bg-k-purple text-white shadow-lg shadow-k-purple/40 scale-105 z-10' 
          : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-k-purple-light'
        }
      `}
    >
      {icon}
      {label}
      {isActive && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-k-mint rounded-full animate-bounce"></div>
      )}
    </button>
  );
};

export default TabButton;
