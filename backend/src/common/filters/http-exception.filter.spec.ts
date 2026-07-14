import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function harness() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ requestId: 'request-test-123' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('keeps readable validation details and adds trace metadata', () => {
    const { host, status, json } = harness();
    new HttpExceptionFilter().catch(new BadRequestException({ message: ['recipientPhone must be valid'] }), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: {
        code: 'REQUEST_INVALID',
        message: 'The request contains invalid fields.',
        details: ['recipientPhone must be valid'],
      },
      requestId: 'request-test-123',
      timestamp: expect.any(String),
    }));
  });

  it('never returns supplied details from a server error', () => {
    const { host, status, json } = harness();
    new HttpExceptionFilter().catch(new InternalServerErrorException({
      message: 'database failure',
      details: { connection: 'postgresql://user:secret@database/internal' },
    }), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The service could not complete the request.',
        details: null,
      },
      requestId: 'request-test-123',
      timestamp: expect.any(String),
    }));
  });
});
