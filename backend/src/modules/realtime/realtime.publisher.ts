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
}
