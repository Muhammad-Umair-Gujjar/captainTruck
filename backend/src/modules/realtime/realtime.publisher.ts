import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import type { LiveLocation } from '../trips/trips.service';

@Injectable()
export class RealtimePublisher {
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  emitTripStatus(tripId: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`trip:${tripId}`).emit('trip:status', payload);
    this.server.to('admin:ops').emit('trip:status', payload);
  }

  emitLocation(tripId: string, payload: LiveLocation) {
    if (!this.server) return;
    this.server.to(`trip:${tripId}`).emit('location:updated', payload);
    this.server.to('admin:ops').emit('location:updated', payload);
  }

  emitChatMessage(
    thread: {
      id: string;
      tripId: string | null;
      participants: Array<{ userId: string }>;
    },
    message: unknown,
  ) {
    if (!this.server) return;
    this.server.to(`chat:${thread.id}`).emit('chat:message', message);
    if (thread.tripId) {
      this.server.to(`trip:${thread.tripId}`).emit('chat:message', message);
    }
    this.server.to('admin:ops').emit('chat:message', message);
    for (const p of thread.participants) {
      this.server.to(`user:${p.userId}`).emit('chat:message', message);
    }
  }
}
