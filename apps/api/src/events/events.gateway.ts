import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private taskRooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.taskRooms.forEach((clients, taskId) => {
      clients.delete(client.id);
      if (clients.size === 0) this.taskRooms.delete(taskId);
    });
  }

  @SubscribeMessage('subscribe_task')
  handleSubscribe(client: Socket, taskId: string) {
    const room = `task:${taskId}`;
    client.join(room);
    if (!this.taskRooms.has(taskId)) this.taskRooms.set(taskId, new Set());
    this.taskRooms.get(taskId)!.add(client.id);
    return { subscribed: taskId };
  }

  @SubscribeMessage('unsubscribe_task')
  handleUnsubscribe(client: Socket, taskId: string) {
    client.leave(`task:${taskId}`);
    this.taskRooms.get(taskId)?.delete(client.id);
    return { unsubscribed: taskId };
  }

  emitTaskUpdate(taskId: string, payload: unknown) {
    this.server.to(`task:${taskId}`).emit('task_update', { task_id: taskId, ...payload as object });
  }

  emitAgentLog(taskId: string, log: unknown) {
    this.server.to(`task:${taskId}`).emit('agent_log', log);
  }

  emitStepUpdate(taskId: string, payload: unknown) {
    this.server.to(`task:${taskId}`).emit('step_update', payload);
  }

  emitOutputReady(taskId: string, payload: unknown) {
    this.server.to(`task:${taskId}`).emit('output_ready', { task_id: taskId, ...payload as object });
  }

  emitApprovalRequest(taskId: string, payload: unknown) {
    this.server.to(`task:${taskId}`).emit('approval_request', payload);
  }
}
