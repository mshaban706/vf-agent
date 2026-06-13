import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AGENT_DEFINITIONS } from '@vf/shared';
import { GlassPanel, AgentAvatar } from '../components/ui';

export function AgentTownPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Agent Town</h1>
        <p className="text-vf-muted text-sm mt-1">
          Visual agent office — Phase 3 will add Phaser pixel office mode
        </p>
      </div>

      <GlassPanel className="p-8 relative overflow-hidden min-h-[500px]">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />

        <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {AGENT_DEFINITIONS.map((agent, i) => (
            <motion.div
              key={agent.slug}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center p-4 rounded-xl bg-vf-black-light/80 border border-vf-border hover:border-vf-gold/30 transition-all"
            >
              <div className="relative">
                <AgentAvatar name={agent.name} color={agent.avatar_color} size="lg" status="idle" />
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-vf-black"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                />
              </div>
              <p className="text-sm font-medium mt-3 text-center">{agent.name.replace(' Agent', '')}</p>
              <p className="text-[10px] text-vf-muted text-center mt-0.5">{agent.role}</p>
              <div className="mt-2 px-2 py-0.5 rounded text-[10px] bg-vf-gold/10 text-vf-gold border border-vf-gold/20">
                At Desk
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-8 text-center">
          <p className="text-vf-muted text-sm">
            Full Phaser-powered pixel office with live agent animations coming in Phase 3.
          </p>
          <Link to="/agents" className="btn-secondary mt-4 inline-block">Back to Agent Directory</Link>
        </div>
      </GlassPanel>
    </div>
  );
}
