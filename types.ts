export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  projectInsights: string;
  polishedIdea?: string;
}

export enum RecordingState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING', // Post-processing or between chunks
  PAUSED = 'PAUSED'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
