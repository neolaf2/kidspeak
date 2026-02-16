
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Scenario, TranscriptionEntry } from '../types';
import { APP_CONFIG } from '../constants';

interface VoiceSessionProps {
  scenario: Scenario;
  onEnd: () => void;
}

const VoiceSession: React.FC<VoiceSessionProps> = ({ scenario, onEnd }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextInputRef = useRef<AudioContext | null>(null);
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Utility functions for audio
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const handleStopSession = useCallback(() => {
    if (sessionRef.current) {
      // In Gemini Live API, usually there's no check, just close if exists
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (audioContextInputRef.current) {
      audioContextInputRef.current.close();
      audioContextInputRef.current = null;
    }
    if (audioContextOutputRef.current) {
      audioContextOutputRef.current.close();
      audioContextOutputRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    if (!process.env.API_KEY) {
      setError("API Key missing. Please configure it.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextInputRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutputRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const systemInstruction = `
        You are a friendly and encouraging English conversation partner for kids aged 7-14.
        Scenario: ${scenario.scenario_title}
        Your Role: ${scenario.role}
        Setting: ${scenario.setting}
        Student Goal: ${scenario.student_goal}
        Target Vocabulary: ${scenario.key_vocabulary.join(', ')}
        
        STRICT RULES:
        1. Keep responses short (1-3 sentences).
        2. Use simple, age-appropriate English.
        3. MODE A (Roleplay): Stay in character. Ask open-ended questions.
        4. MODE B (Feedback): If the student speaks, briefly praise them (1 sentence), 
           then gently correct 1 grammar/pronunciation issue if needed, 
           suggest an improved version, and return to roleplay by asking the next question.
        5. Tone: Positive, patient, and safe.
        6. Start by briefly introducing the setting and your character, then ask the first question.
      `;

      const sessionPromise = ai.live.connect({
        model: APP_CONFIG.MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setIsActive(true);
            setIsConnecting(false);

            // Audio Input streaming
            if (audioContextInputRef.current) {
              const source = audioContextInputRef.current.createMediaStreamSource(stream);
              const scriptProcessor = audioContextInputRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => {
                  if (session) session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInputRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOutputRef.current) {
              setIsAiSpeaking(true);
              const ctx = audioContextOutputRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscription.current) {
                setTranscriptions(prev => [...prev, {
                  type: 'user',
                  text: currentInputTranscription.current,
                  timestamp: Date.now()
                }]);
                currentInputTranscription.current = '';
              }
              if (currentOutputTranscription.current) {
                setTranscriptions(prev => [...prev, {
                  type: 'ai',
                  text: currentOutputTranscription.current,
                  timestamp: Date.now()
                }]);
                currentOutputTranscription.current = '';
              }
            }
          },
          onerror: (e) => {
            console.error('Session Error:', e);
            setError("Something went wrong with the voice connection.");
            handleStopSession();
          },
          onclose: () => {
            console.log('Session closed');
            handleStopSession();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start the session.");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (transcriptionContainerRef.current) {
      transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight;
    }
  }, [transcriptions]);

  useEffect(() => {
    return () => handleStopSession();
  }, [handleStopSession]);

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 flex flex-col h-[70vh] border-4 border-sky-100 relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-3xl rounded-full opacity-20 pointer-events-none transition-colors duration-500 ${isAiSpeaking ? 'bg-yellow-400' : 'bg-sky-400'}`}></div>

      <div className="flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${scenario.color} rounded-xl flex items-center justify-center text-2xl shadow-md`}>
            {scenario.emoji}
          </div>
          <div>
            <h2 className="text-xl font-bold text-sky-900 leading-tight">{scenario.scenario_title}</h2>
            <p className="text-sm text-sky-500">I am your {scenario.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
           <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">{isActive ? 'Live' : 'Ready'}</span>
        </div>
      </div>

      {/* Goal Banner */}
      <div className="bg-sky-50 rounded-2xl p-4 mb-6 border border-sky-100 z-10">
        <div className="text-xs font-bold text-sky-400 uppercase mb-1">Your Mission:</div>
        <p className="text-sky-800 text-sm italic">"{scenario.student_goal}"</p>
      </div>

      {/* Transcriptions */}
      <div 
        ref={transcriptionContainerRef}
        className="flex-grow overflow-y-auto mb-6 space-y-4 pr-2 scroll-smooth"
      >
        {transcriptions.length === 0 && !isActive && !isConnecting && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-4xl mb-4">👋</div>
            <p className="text-sky-400 font-medium">Click "Start Session" to begin your English practice!</p>
          </div>
        )}
        
        {isConnecting && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sky-500 font-bold">Connecting to AI Mentor...</p>
          </div>
        )}

        {transcriptions.map((t, idx) => (
          <div 
            key={t.timestamp + idx} 
            className={`flex ${t.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              t.type === 'user' 
                ? 'bg-sky-500 text-white rounded-tr-none' 
                : 'bg-white border border-sky-100 text-sky-900 rounded-tl-none'
            }`}>
              <p className="text-sm md:text-base leading-relaxed">{t.text}</p>
            </div>
          </div>
        ))}

        {isAiSpeaking && transcriptions.length > 0 && transcriptions[transcriptions.length-1].type === 'user' && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-xl text-xs border border-red-100 text-center">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-4 z-10">
        {!isActive && !isConnecting ? (
          <button
            onClick={startSession}
            className="w-full py-5 bg-sky-500 hover:bg-sky-600 text-white text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎙️</span> Start Speaking!
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-center gap-6 p-4 bg-sky-50 rounded-2xl">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isAiSpeaking ? 'bg-yellow-400 scale-110 shadow-lg' : 'bg-sky-400'}`}>
                <span className="text-3xl">{isAiSpeaking ? '✨' : '👤'}</span>
              </div>
              <div className="text-sky-900">
                <div className="font-bold text-lg">{isAiSpeaking ? `${scenario.role} is speaking...` : 'Your turn to speak!'}</div>
                <div className="text-xs text-sky-500 uppercase tracking-widest font-bold">
                  {isAiSpeaking ? 'Listening mode' : 'Microphone active'}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleStopSession}
              className="w-full py-4 bg-white hover:bg-red-50 text-red-500 font-bold rounded-2xl border-2 border-red-100 transition-all active:scale-95"
            >
              Finish Session
            </button>
          </div>
        )}
      </div>

      {/* Decorative dots */}
      <div className="absolute bottom-4 left-4 flex gap-1">
        <div className="w-2 h-2 bg-sky-200 rounded-full"></div>
        <div className="w-2 h-2 bg-sky-100 rounded-full"></div>
      </div>
    </div>
  );
};

export default VoiceSession;
