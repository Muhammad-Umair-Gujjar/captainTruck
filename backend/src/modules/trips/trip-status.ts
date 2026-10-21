import { TripStatus } from '@prisma/client';

export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.ASSIGNED]: [TripStatus.EN_ROUTE_PICKUP, TripStatus.CANCELLED],
  [TripStatus.EN_ROUTE_PICKUP]: [
    TripStatus.ARRIVED_PICKUP,
    TripStatus.CANCELLED,
  ],
  [TripStatus.ARRIVED_PICKUP]: [TripStatus.IN_TRANSIT, TripStatus.CANCELLED],
  [TripStatus.IN_TRANSIT]: [TripStatus.DELIVERED, TripStatus.CANCELLED],
  [TripStatus.DELIVERED]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export function canTransitionTrip(from: TripStatus, to: TripStatus): boolean {
  return TRIP_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses that still accept GPS updates. */
export const GPS_ALLOWED: TripStatus[] = [
  TripStatus.ASSIGNED,
  TripStatus.EN_ROUTE_PICKUP,
  TripStatus.ARRIVED_PICKUP,
  TripStatus.IN_TRANSIT,
  TripStatus.DELIVERED,
];

export const GPS_SEALED: TripStatus[] = [
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
];
