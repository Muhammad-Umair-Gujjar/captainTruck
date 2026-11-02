import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';
import type { LiveLocation } from './types';

export type TripStatusEvent = {
  tripId: string;
  status: string;
  requestId?: string;
};

export function connectRealtime(accessToken: string): Socket {
  return io(`${SOCKET_URL}/realtime`, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}

export function joinTrip(
  socket: Socket,
  tripId: string,
): Promise<{ ok: boolean; location?: LiveLocation | null; message?: string }> {
  return new Promise((resolve) => {
    socket.emit(
      'trip:join',
      { tripId },
      (ack: {
        ok?: boolean;
        location?: LiveLocation | null;
        message?: string;
      }) => {
        resolve({
          ok: Boolean(ack?.ok),
          location: ack?.location ?? null,
          message: ack?.message,
        });
      },
    );
  });
}

export function leaveTrip(socket: Socket, tripId: string): void {
  socket.emit('trip:leave', { tripId });
}
