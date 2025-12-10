import { useState, useRef, useCallback } from 'react';
import { RecordingState } from '../types';

interface UseAudioRecorderProps {
  onAudioChunk: (blob: Blob) => void;
  onError: (message: string, type?: 'error' | 'info') => void;
  chunkInterval?: number; // ms
}

export const useAudioRecorder = ({ onAudioChunk, onError, chunkInterval = 5000 }: UseAudioRecorderProps) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamTracksRef = useRef<MediaStreamTrack[]>([]);
  const isRecordingRef = useRef<boolean>(false);

  const startChunkLoop = useCallback(async () => {
     if (isRecordingRef.current) return;

     try {
       isRecordingRef.current = true;
       setRecordingState(RecordingState.RECORDING);

       let screenStream: MediaStream | null = null;
       let usingScreenAudio = false;

       // 1. Try to Get System Audio (Meeting sound)
       try {
         // Check if getDisplayMedia is supported
         if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
             screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, // Required for getDisplayMedia
                audio: {
                  echoCancellation: true, 
                  noiseSuppression: true, 
                  autoGainControl: true
                }
             });
         }
       } catch (err: any) {
         const errorMessage = String(err);
         
         // If blocked by permissions policy, notify and fallback
         if (errorMessage.includes("permissions policy") || errorMessage.includes("denied")) {
             if (errorMessage.includes("permissions policy")) {
                onError("System audio blocked (browser restriction). Falling back to Microphone. Open in new tab to capture system audio.", 'info');
             } else {
                // User cancelled the dialog manually, allow them to proceed if they want, 
                // but usually cancellation means "don't record screen". 
                // We'll fallback to mic but notify.
                console.warn("User cancelled system audio selection.");
             }
         } else {
             console.warn("getDisplayMedia failed:", err);
         }
       }

       // Check if user actually shared audio (if stream exists)
       if (screenStream) {
           const screenAudioTrack = screenStream.getAudioTracks()[0];
           if (screenAudioTrack) {
               usingScreenAudio = true;
               // If user stops sharing via browser UI, stop recording
               screenAudioTrack.onended = () => {
                   stopRecording();
               };
           } else {
               // User didn't check "Share Audio"
               onError("No system audio detected. Please ensure 'Share Audio' is checked in the browser dialog. Recording Microphone only.", 'info');
               // Stop the video track since we don't need it
               screenStream.getTracks().forEach(t => t.stop());
               screenStream = null;
           }
       }

       // 2. Get Microphone Audio (User voice)
       let micStream: MediaStream | null = null;
       try {
         micStream = await navigator.mediaDevices.getUserMedia({ 
           audio: { echoCancellation: true, noiseSuppression: true } 
         });
       } catch (micErr) {
         console.warn("Microphone access denied or failed.", micErr);
       }

       // If we have neither, we can't record
       if (!usingScreenAudio && !micStream) {
         onError("Could not access Microphone or System Audio. Please check permissions.", 'error');
         stopRecording();
         return;
       }

       // 3. Mix streams using AudioContext
       const audioContext = new AudioContext();
       audioContextRef.current = audioContext;
       
       const dest = audioContext.createMediaStreamDestination();
       
       // Add Screen Audio to Mix
       if (screenStream && usingScreenAudio) {
         const screenSource = audioContext.createMediaStreamSource(screenStream);
         screenSource.connect(dest);
       }

       // Add Mic Audio to Mix (if available)
       if (micStream) {
         const micSource = audioContext.createMediaStreamSource(micStream);
         micSource.connect(dest);
       }

       // Keep track of all tracks to stop them later
       streamTracksRef.current = [
         ...(screenStream ? screenStream.getTracks() : []),
         ...(micStream ? micStream.getTracks() : [])
       ];

       const mixedStream = dest.stream;

       // 4. Start Recording Logic
       const recordSegment = () => {
         if (!isRecordingRef.current) return;
         if (audioContext.state === 'closed') return; 
         
         let mimeType = 'audio/webm';
         if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
         } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
         }
         
         const recorder = new MediaRecorder(mixedStream, { mimeType });
         const chunks: Blob[] = [];
         
         recorder.ondataavailable = (e) => {
           if (e.data.size > 0) chunks.push(e.data);
         };

         recorder.onstop = () => {
           const blob = new Blob(chunks, { type: mimeType });
           if (blob.size > 0) {
              onAudioChunk(blob);
           }
         };
         
         recorder.start();
         
         // Schedule next chunk
         setTimeout(() => {
           if (recorder.state === 'recording') {
             recorder.stop();
             // Check if we should continue
             if (isRecordingRef.current) { 
                recordSegment();
             }
           }
         }, chunkInterval);
         
         mediaRecorderRef.current = recorder; 
       };

       recordSegment();

     } catch (err: any) {
       console.error("Error starting recording:", err);
       onError(`Failed to start recording: ${err.message}`, 'error');
       stopRecording();
     }
  }, [chunkInterval, onAudioChunk, onError]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    // Stop Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all raw media tracks (Screen + Mic)
    if (streamTracksRef.current) {
        streamTracksRef.current.forEach(track => track.stop());
        streamTracksRef.current = [];
    }

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setRecordingState(RecordingState.IDLE);
  }, []);

  return {
    recordingState,
    startRecording: startChunkLoop,
    stopRecording
  };
};