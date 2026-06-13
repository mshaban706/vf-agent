import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/events`, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

export function subscribeToTask(taskId: string, handlers: {
  onLog?: (log: Record<string, unknown>) => void;
  onTaskUpdate?: (data: Record<string, unknown>) => void;
  onStepUpdate?: (data: Record<string, unknown>) => void;
  onOutputReady?: (data: Record<string, unknown>) => void;
}) {
  const s = getSocket();
  s.emit('subscribe_task', taskId);

  if (handlers.onLog) s.on('agent_log', handlers.onLog);
  if (handlers.onTaskUpdate) s.on('task_update', handlers.onTaskUpdate);
  if (handlers.onStepUpdate) s.on('step_update', handlers.onStepUpdate);
  if (handlers.onOutputReady) s.on('output_ready', handlers.onOutputReady);

  return () => {
    s.emit('unsubscribe_task', taskId);
    if (handlers.onLog) s.off('agent_log', handlers.onLog);
    if (handlers.onTaskUpdate) s.off('task_update', handlers.onTaskUpdate);
    if (handlers.onStepUpdate) s.off('step_update', handlers.onStepUpdate);
    if (handlers.onOutputReady) s.off('output_ready', handlers.onOutputReady);
  };
}
