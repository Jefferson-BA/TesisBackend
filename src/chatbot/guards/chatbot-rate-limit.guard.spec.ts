import { ExecutionContext, HttpException } from '@nestjs/common';
import { ChatbotRateLimitGuard } from './chatbot-rate-limit.guard';
describe('Chatbot rate limit', () => {
  it('rejects the eleventh request from the same address in one minute', () => {
    const guard = new ChatbotRateLimitGuard();
    const response = { setHeader: jest.fn() };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1', socket: {} }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    for (let i = 0; i < 10; i++) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(Number),
    );
  });
});
