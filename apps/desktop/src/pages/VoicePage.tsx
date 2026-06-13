import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../components/ui';
import { api } from '../lib/api';
import { useAppStore } from '../stores/app';

export function VoicePage() {
  const { currentWorkspace } = useAppStore();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const toggleListening = () => {
    const next = !listening;
    setListening(next);
    if (next) {
      setTranscript(
        'Voice command is a Phase 2 feature. Microphone permission will be requested when speech-to-text (Whisper/local STT) is integrated. No audio is being recorded right now.',
      );
      if (currentWorkspace) {
        api.logs
          .add({ workspace_id: currentWorkspace.id, level: 'info', message: 'Voice command panel activated (Phase 2 preview)' })
          .catch(() => {});
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="font-display text-2xl font-bold mb-1">Voice Command Panel</h1>
      <p className="text-vf-muted text-sm mb-6">Speak commands to your AI workforce — Phase 2 feature</p>

      <GlassPanel gold className="p-12 flex flex-col items-center max-w-lg mx-auto">
        <motion.button
          onClick={toggleListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            listening
              ? 'bg-red-500/20 border-2 border-red-400 animate-pulse'
              : 'bg-vf-gold/10 border-2 border-vf-gold/30 hover:border-vf-gold'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          {listening ? (
            <MicOff className="w-10 h-10 text-red-400" />
          ) : (
            <Mic className="w-10 h-10 text-vf-gold" />
          )}
        </motion.button>

        <p className="text-sm text-vf-muted mt-6">
          {listening ? 'Listening... (Phase 2 preview)' : 'Click to start voice command'}
        </p>

        {transcript && (
          <div className="mt-6 w-full p-4 rounded-lg bg-vf-black-light border border-vf-border">
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        <p className="text-xs text-vf-muted mt-6 text-center">
          Phase 2 will integrate Whisper or local speech-to-text with ElevenLabs/Piper TTS for agent responses.
        </p>
      </GlassPanel>
    </div>
  );
}
