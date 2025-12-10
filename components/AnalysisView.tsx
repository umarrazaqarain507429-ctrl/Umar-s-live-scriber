import React from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisViewProps {
  analysisMarkdown: string;
  isAnalyzing: boolean;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysisMarkdown, isAnalyzing }) => {

  const handleDownload = () => {
    if (!analysisMarkdown) return;
    const blob = new Blob([analysisMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-lg relative">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="12.01" x2="20.73" y2="6.96"/></svg>
          Gemini Intelligence
        </h2>
        
        <div className="flex items-center gap-3">
            {isAnalyzing && (
              <span className="text-xs text-purple-400 flex items-center gap-1 animate-pulse">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            )}
            
            {analysisMarkdown && (
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-purple-900/50 hover:text-purple-200 border border-slate-700 hover:border-purple-500/50 rounded-md transition-all shadow-sm"
                    title="Download Summary Report"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Download
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
        {!analysisMarkdown ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/><path d="M14 8V6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-2"/><path d="M20 12h2"/><path d="m17 9 3 3-3 3"/><path d="M14 12h-2"/></svg>
            <p className="text-center max-w-sm">
              AI analysis will appear here as the meeting progresses. Speak clearly to see summaries, action items, and insights.
            </p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
               components={{
                 h3: ({node, ...props}) => <h3 className="text-purple-300 font-bold mt-6 mb-3 border-b border-purple-500/30 pb-1" {...props} />,
                 ul: ({node, ...props}) => <ul className="space-y-1 mb-4" {...props} />,
                 li: ({node, ...props}) => <li className="text-slate-300 flex items-start" {...props}><span className="mr-2 text-purple-400">•</span><span className="flex-1">{props.children}</span></li>,
                 strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                 p: ({node, ...props}) => <p className="text-slate-300 mb-4 leading-relaxed" {...props} />
               }}
            >
              {analysisMarkdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};