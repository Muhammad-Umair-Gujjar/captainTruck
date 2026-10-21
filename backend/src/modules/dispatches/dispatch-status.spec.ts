import { DispatchStatus } from '@prisma/client';
import { canTransition } from './dispatch-status';

describe('dispatch status transitions', () => {
  it('allows draft → awaiting_route_selection', () => {
    expect(
      canTransition(
        DispatchStatus.DRAFT,
        DispatchStatus.AWAITING_ROUTE_SELECTION,
      ),
    ).toBe(true);
  });

  it('rejects completed → draft', () => {
    expect(canTransition(DispatchStatus.COMPLETED, DispatchStatus.DRAFT)).toBe(
      false,
    );
  });

  it('allows awaiting → pending_admin', () => {
    expect(
      canTransition(
        DispatchStatus.AWAITING_ROUTE_SELECTION,
        DispatchStatus.PENDING_ADMIN,
      ),
    ).toBe(true);
  });

  it('allows pending_admin → approved_assigned / rejected', () => {
    expect(
      canTransition(
        DispatchStatus.PENDING_ADMIN,
        DispatchStatus.APPROVED_ASSIGNED,
      ),
    ).toBe(true);
    expect(
      canTransition(DispatchStatus.PENDING_ADMIN, DispatchStatus.REJECTED),
    ).toBe(true);
  });

  it('allows approved_assigned → rejected (admin unassign)', () => {
    expect(
      canTransition(DispatchStatus.APPROVED_ASSIGNED, DispatchStatus.REJECTED),
    ).toBe(true);
  });
});
