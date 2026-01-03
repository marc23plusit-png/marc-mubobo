import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { LanguageCode, translations } from '../translations';

interface VoiceAssistantProps {
  onSearchResult: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentLang?: LanguageCode;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onSearchResult, isOpen, onClose, currentLang = 'en' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  
  const t = translations[currentLang];
  const isRTL = currentLang === 'ar';

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
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

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputContext.createMediaStreamSource(stream);
            const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => prev + message.serverContent?.inputTranscription?.text);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e) => console.error("Live API Error", e),
          onclose: () => setIsListening(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: `You are ShopSnap Aurora Assistant. Help users find products. Tone: futuristic. Current language: ${currentLang}. Please respond in ${currentLang}.`
        }
      });

      sessionRef.current = await sessionPromise;
      setIsListening(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    setIsListening(false);
    for (const source of sourcesRef.current.values()) {
      source.stop();
    }
    sourcesRef.current.clear();
  };

  useEffect(() => {
    if (isOpen) startSession(); else stopSession();
    return () => stopSession();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="frosted-glass w-full max-w-lg overflow-hidden border-white/10 shadow-2xl">
        <div className="p-10 text-center">
          <div className={`flex justify-between items-center mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-gradient font-black text-2xl tracking-tight uppercase tracking-[0.2em]">{t.languageSelect}</h2>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/40">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          <div className="relative py-12">
            <div className={`w-32 h-32 mx-auto rounded-full modern-gradient flex items-center justify-center mb-8 transition-all duration-700 ${isListening ? 'scale-110 shadow-xl' : 'scale-100 opacity-20'}`}>
              <i className="fa-solid fa-microphone text-white text-4xl"></i>
            </div>
          </div>

          <div className="bg-white/5 rounded-[2rem] p-8 min-h-[140px] mb-8 border border-white/5 text-slate-200 text-lg font-medium leading-relaxed">
             {transcription || t.queryMarket}
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => { if (transcription) onSearchResult(transcription); onClose(); }}
              disabled={!transcription}
              className="w-full modern-gradient text-white py-6 rounded-2xl font-black text-xl hover:opacity-90 disabled:opacity-20 transition-all shadow-xl"
            >
              {currentLang === 'en' ? 'Confirm Query' : t.buyNow}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
