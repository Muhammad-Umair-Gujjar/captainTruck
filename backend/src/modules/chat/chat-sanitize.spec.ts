import { sanitizeChatBody } from './chat-sanitize';

describe('sanitizeChatBody', () => {
  it('strips HTML tags', () => {
    expect(sanitizeChatBody('Hello <script>alert(1)</script>')).toBe(
      'Hello alert(1)',
    );
  });

  it('trims whitespace', () => {
    expect(sanitizeChatBody('  hi  ')).toBe('hi');
  });
});
