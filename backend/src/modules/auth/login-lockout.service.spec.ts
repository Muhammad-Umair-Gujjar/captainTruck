import { LoginLockoutService } from './login-lockout.service';

describe('LoginLockoutService', () => {
  it('locks after 5 failures', () => {
    const service = new LoginLockoutService();
    const email = 'lock@test.com';

    for (let i = 0; i < 4; i += 1) {
      expect(service.recordFailure(email).locked).toBe(false);
    }

    const locked = service.recordFailure(email);
    expect(locked.locked).toBe(true);
    expect(service.isLocked(email).locked).toBe(true);
  });

  it('clears failures on clear()', () => {
    const service = new LoginLockoutService();
    const email = 'clear@test.com';
    service.recordFailure(email);
    service.clear(email);
    expect(service.isLocked(email).locked).toBe(false);
  });
});
