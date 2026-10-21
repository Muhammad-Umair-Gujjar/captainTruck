import { TripStatus } from '@prisma/client';
import { canTransitionTrip } from './trip-status';

describe('trip status transitions', () => {
  it('allows assigned → en_route_pickup', () => {
    expect(
      canTransitionTrip(TripStatus.ASSIGNED, TripStatus.EN_ROUTE_PICKUP),
    ).toBe(true);
  });

  it('allows delivered → completed', () => {
    expect(canTransitionTrip(TripStatus.DELIVERED, TripStatus.COMPLETED)).toBe(
      true,
    );
  });

  it('rejects completed → assigned', () => {
    expect(canTransitionTrip(TripStatus.COMPLETED, TripStatus.ASSIGNED)).toBe(
      false,
    );
  });

  it('rejects skipping steps', () => {
    expect(canTransitionTrip(TripStatus.ASSIGNED, TripStatus.IN_TRANSIT)).toBe(
      false,
    );
  });
});
