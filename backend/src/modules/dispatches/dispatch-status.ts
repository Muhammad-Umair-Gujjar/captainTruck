import { DispatchStatus } from '@prisma/client';

/**
 * Allowed transitions for Phase 6+.
 * Client cannot set status directly — only via service methods.
 */
export const DISPATCH_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  [DispatchStatus.DRAFT]: [
    DispatchStatus.AWAITING_ROUTE_SELECTION,
    DispatchStatus.CANCELLED,
  ],
  [DispatchStatus.AWAITING_ROUTE_SELECTION]: [
    DispatchStatus.PENDING_ADMIN, // after route select (Phase 7)
    DispatchStatus.CANCELLED,
  ],
  [DispatchStatus.PENDING_ADMIN]: [
    DispatchStatus.APPROVED_ASSIGNED, // Phase 9
    DispatchStatus.REJECTED, // Phase 9
    DispatchStatus.CANCELLED,
  ],
  [DispatchStatus.APPROVED_ASSIGNED]: [
    DispatchStatus.IN_PROGRESS,
    DispatchStatus.CANCELLED,
  ],
  [DispatchStatus.REJECTED]: [],
  [DispatchStatus.CANCELLED]: [],
  [DispatchStatus.IN_PROGRESS]: [DispatchStatus.COMPLETED],
  [DispatchStatus.COMPLETED]: [],
};

export function canTransition(
  from: DispatchStatus,
  to: DispatchStatus,
): boolean {
  return DISPATCH_TRANSITIONS[from]?.includes(to) ?? false;
}

export const CUSTOMER_CANCELLABLE: DispatchStatus[] = [
  DispatchStatus.DRAFT,
  DispatchStatus.AWAITING_ROUTE_SELECTION,
  DispatchStatus.PENDING_ADMIN,
];
