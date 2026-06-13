import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAppStore } from '../stores/app';
import { GlassPanel } from './ui';

const EXAMPLE_COMMANDS = [
  'Do complete SEO research for polarinsulation.us within a 150-mile radius.',
  'Create location-wise keyword tabs for all insulation service areas.',
  'Audit this website and give it a Valiant Firm score out of 100.',
  'Build Google Ads campaign structure for Jacuzzi walk-in tubs.',
  'Create a 30-day SEO plan for Big Bend Gutters.',
];

export function CommandInput({ clientId }: { clientId?: string }) {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useAppStore();
  const navigate = useNavigate();

  const execute = async () => {
    if (!command.trim() || !currentWorkspace) return;
    setLoading(true);
    try {
      const result = await api.commands.execute({
        command: command.trim(),
        workspace_id: currentWorkspace.id,
        client_id: clientId,
      });
      setCommand('');
      navigate(`/tasks/${result.task_id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel gold className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-vf-gold" />
        <span className="text-sm font-medium text-vf-gold">Command Input</span>
      </div>

      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Give a command to your AI workforce..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && execute()}
          disabled={loading || !currentWorkspace}
        />
        <button
          onClick={execute}
          disabled={loading || !command.trim() || !currentWorkspace}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Sparkles className="w-4 h-4" />
            </motion.div>
          ) : (
            <Send className="w-4 h-4" />
          )}
          Execute
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_COMMANDS.slice(0, 3).map((cmd) => (
          <button
            key={cmd}
            onClick={() => setCommand(cmd)}
            className="text-xs px-2 py-1 rounded-md bg-vf-black-light border border-vf-border text-vf-muted hover:text-vf-gold hover:border-vf-gold/30 transition-all truncate max-w-xs"
          >
            {cmd.slice(0, 60)}...
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
