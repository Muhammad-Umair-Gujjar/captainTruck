import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  connectRealtime,
  joinTrip,
  leaveTrip,
  type TripStatusEvent,
} from '@/lib/realtime';
import type { LiveLocation } from '@/lib/types';

/**
 * Opens Socket.IO /realtime, joins trip room, tracks live GPS + status.
 * Admins are also in admin:ops; we still join trip:{id} for initial location ack.
 */
export function useTripLive(
  tripId: string | undefined,
  initial?: LiveLocation | null,
) {
  const { accessToken } = useAuth();
  const [location, setLocation] = useState<LiveLocation | null>(
    initial ?? null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocation(initial ?? null);
  }, [initial]);

  useEffect(() => {
    if (!tripId || !accessToken) return;

    const socket = connectRealtime(accessToken);
    let active = true;

    const onConnect = () => {
      if (!active) return;
      setConnected(true);
      setError(null);
      void joinTrip(socket, tripId).then((ack) => {
        if (!active) return;
        if (!ack.ok) {
          setError(ack.message ?? 'Could not join trip room');
          return;
        }
        if (ack.location) setLocation(ack.location);
      });
    };

    const onDisconnect = () => {
      if (active) setConnected(false);
    };

    const onLocation = (payload: LiveLocation) => {
      if (!active || payload.tripId !== tripId) return;
      setLocation(payload);
    };

    const onStatus = (payload: TripStatusEvent) => {
      if (!active || payload.tripId !== tripId) return;
      setStatus(payload.status);
    };

    const onSockError = (payload: { message?: string }) => {
      if (active) setError(payload.message ?? 'Socket error');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('location:updated', onLocation);
    socket.on('trip:status', onStatus);
    socket.on('error', onSockError);

    if (socket.connected) onConnect();

    return () => {
      active = false;
      leaveTrip(socket, tripId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('location:updated', onLocation);
      socket.off('trip:status', onStatus);
      socket.off('error', onSockError);
      socket.disconnect();
    };
  }, [accessToken, tripId]);

  return { location, status, connected, error };
}
