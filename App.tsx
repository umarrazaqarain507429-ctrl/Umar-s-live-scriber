import React, { useState, useEffect, useCallback } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { transcribeAudio, analyzeTranscript } from './services/geminiService';
import { TranscriptView } from './components/TranscriptView';
import { AnalysisView } from './components/AnalysisView';
import { TranscriptChunk, RecordingState } from './types';
import { Toast } from './components/Toast';


function App() {
  const APP_NAME = "Scribo";
  const APP_SUBTITLE = "Intelligent Meeting Assistant";

  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [fullTranscript, setFullTranscript] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  
  // Initialize from localStorage to remember preference across reloads
  const [enableSystemAudio, setEnableSystemAudio] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableSystemAudio');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  
  // Error handling state
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);

  // Constants
  const CHUNK_INTERVAL = 8000; // 8 seconds per audio chunk
  const ANALYSIS_TRIGGER_LENGTH = 150; // Analyze after approx 150 characters of new text

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
  };

  const handleAudioChunk = useCallback(async (blob: Blob) => {
    processAudioChunk(blob);
  }, []);

  const processAudioChunk = async (blob: Blob) => {
    try {
      const text = await transcribeAudio(blob);
      if (!text) return;

      const newChunk: TranscriptChunk = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now(),
        isFinal: true
      };

      setTranscriptChunks(prev => [...prev, newChunk]);
      // Use newline to separate chunks properly for the analysis engine to detect speaker lines
      setFullTranscript(prev => prev + "\n" + text);
    } catch (error: any) {
      // Log error but don't spam toasts for every single chunk failure unless it's critical
      console.warn("Chunk processing failed:", error);
      // Only show toast if we are just starting or it's a critical auth error
      if (transcriptChunks.length === 0 || String(error).includes("API Key")) {
         showToast(error.message, 'error');
      }
    }
  };

  const { recordingState, startRecording, stopRecording } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
    onError: (msg, type) => {
        showToast(msg, type || 'error');
        // Auto-disable system audio if blocked to prevent repetitive errors and persist choice
        if (msg.includes("System audio blocked")) {
            setEnableSystemAudio(false);
            localStorage.setItem('enableSystemAudio', 'false');
        }
    },
    chunkInterval: CHUNK_INTERVAL,
    enableSystemAudio
  });

  // Effect to trigger analysis when transcript grows sufficiently
  useEffect(() => {
    const currentLength = fullTranscript.length;
    
    // Simple debounce/threshold logic
    if (currentLength - lastAnalyzedLength > ANALYSIS_TRIGGER_LENGTH && !isAnalyzing) {
      triggerAnalysis();
    }
  }, [fullTranscript, isAnalyzing, lastAnalyzedLength]);

  const triggerAnalysis = async () => {
    if (isAnalyzing || !fullTranscript.trim()) return;
    
    setIsAnalyzing(true);
    setLastAnalyzedLength(fullTranscript.length); 

    try {
      const result = await analyzeTranscript(fullTranscript);
      setAnalysisResult(result);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRecording = () => {
    if (recordingState === RecordingState.RECORDING) {
      stopRecording();
      triggerAnalysis();
    } else {
      startRecording();
    }
  };

  const handleClear = () => {
    if (recordingState === RecordingState.RECORDING) stopRecording();
    setTranscriptChunks([]);
    setFullTranscript("");
    setAnalysisResult("");
    setLastAnalyzedLength(0);
    showToast("Transcript cleared.", 'info');
  };

  const toggleAudioSource = () => {
      setEnableSystemAudio(prev => {
          const newVal = !prev;
          localStorage.setItem('enableSystemAudio', String(newVal));
          showToast(newVal ? "Mode: System Audio + Mic" : "Mode: Microphone Only", 'info');
          return newVal;
      });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden font-sans">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </div>
          <div>
           <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            {APP_NAME}
          </h1>
            <p className="text-xs text-slate-400">{APP_SUBTITLE}</p>

          </div>
        </div>

        <div className="flex items-center gap-4">
           {recordingState === RecordingState.RECORDING && (
             <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-in fade-in zoom-in duration-300">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               <span className="text-xs font-medium text-red-400">
                 Recording Meeting...
               </span>
             </div>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Column: Transcript */}
        <div className="flex-1 flex flex-col min-h-[300px] h-full overflow-hidden">
          <TranscriptView 
            chunks={transcriptChunks} 
            isProcessing={recordingState === RecordingState.RECORDING} 
          />
        </div>

        {/* Right Column: Analysis */}
        <div className="flex-1 flex flex-col min-h-[300px] h-full overflow-hidden">
          <AnalysisView 
            analysisMarkdown={analysisResult} 
            isAnalyzing={isAnalyzing} 
          />
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="h-24 border-t border-slate-700 bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-center gap-6 px-6 shrink-0 z-20">
        
        <div className="flex items-center gap-6">
          
          <button
            onClick={toggleAudioSource}
            className={`p-3 rounded-full transition-colors tooltip-trigger border ${enableSystemAudio ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' : 'text-slate-400 border-slate-600 bg-slate-800 hover:text-slate-200'}`}
            title={enableSystemAudio ? "Mode: System Audio + Mic" : "Mode: Mic Only"}
          >
             {enableSystemAudio ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
             )}
          </button>

          <button
            onClick={handleClear}
            className="p-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors tooltip-trigger"
            title="Clear Transcript"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>

          <button
            onClick={handleToggleRecording}
            className={`
              group relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300
              ${recordingState === RecordingState.RECORDING 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}
            `}
            title={recordingState === RecordingState.IDLE ? "Start Meeting Capture" : "Stop Recording"}
          >
            {recordingState === RecordingState.RECORDING ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>

          <button
            onClick={() => triggerAnalysis()}
            disabled={!fullTranscript.trim() || isAnalyzing}
            className="p-3 text-purple-400 hover:text-purple-200 hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Force Analyze"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="12.01" x2="20.73" y2="6.96"/></svg>
          </button>
        </div>
        
        {/* Helper Text */}
        <div className="hidden md:block absolute right-8 text-xs text-slate-500 max-w-[200px] text-right">
            {enableSystemAudio ? "Captures Meeting Audio & Mic" : "Captures Microphone Only"}
        </div>
      </footer>
    </div>
  );
}

export default App;