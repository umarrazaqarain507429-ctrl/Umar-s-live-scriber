import React, { useEffect, useRef } from 'react';
import { TranscriptChunk } from '../types';

interface TranscriptViewProps {
  chunks: TranscriptChunk[];
  isProcessing: boolean;
}

// Utility to assign a stable color to a speaker ID
const getSpeakerColor = (speakerName: string) => {
  const colors = [
    'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    'text-purple-400 border-purple-400/30 bg-purple-400/10',
    'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    'text-amber-400 border-amber-400/30 bg-amber-400/10',
    'text-pink-400 border-pink-400/30 bg-pink-400/10',
    'text-blue-400 border-blue-400/30 bg-blue-400/10',
  ];
  
  // Simple hash to pick a color
  let hash = 0;
  for (let i = 0; i < speakerName.length; i++) {
    hash = speakerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const TranscriptItem: React.FC<{ text: string }> = ({ text }) => {
  // Regex to detect "Speaker X:" or "Speaker 1:" at start of line
  const speakerRegex = /^(Speaker \d+|Speaker [A-Z]|Participant \d+|User):/i;
  
  // Split by newlines first to handle multi-line chunks
  const lines = text.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const match = line.match(speakerRegex);
        
        if (match) {
          const speakerLabel = match[1]; // e.g. "Speaker 1"
          const message = line.replace(speakerRegex, '').trim();
          const colorClass = getSpeakerColor(speakerLabel);

          return (
            <div key={idx} className="flex flex-col gap-1">
              <span className={`self-start text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${colorClass}`}>
                {speakerLabel}
              </span>
              <span className="text-slate-200 leading-relaxed pl-1">
                {message}
              </span>
            </div>
          );
        }

        // Fallback for lines without explicit speaker label
        return (
          <div key={idx} className="text-slate-200 leading-relaxed">
            {line}
          </div>
        );
      })}
    </div>
  );
};

export const TranscriptView: React.FC<TranscriptViewProps> = ({ chunks, isProcessing }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  return (
    <div className="flex flex-col h-full bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          Live Transcript
        </h2>
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            Listening...
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chunks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
            <p>Start recording to see transcript...</p>
          </div>
        ) : (
          chunks.map((chunk) => (
            <div key={chunk.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500 group">
               <div className="flex gap-3">
                 <span className="text-slate-500 text-[10px] font-mono mt-1 shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity">
                   {new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                 </span>
                 <div className="flex-1">
                   <TranscriptItem text={chunk.text} />
                 </div>
               </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};