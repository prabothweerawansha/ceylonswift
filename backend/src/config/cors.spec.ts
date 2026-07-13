import { isOriginAllowed } from './cors';
import { parseCsvOrigins } from './configuration';

describe('CORS configuration', () => {
  it('parses, trims, and deduplicates exact origins', () => {
    expect(parseCsvOrigins('http://localhost:5500, https://app.ceylonswift.com,http://localhost:5500')).toEqual([
      'http://localhost:5500',
      'https://app.ceylonswift.com',
    ]);
  });

  it('allows non-browser requests and exact configured origins', () => {
    const origins = ['http://localhost:5500'];
    expect(isOriginAllowed(undefined, origins)).toBe(true);
    expect(isOriginAllowed('http://localhost:5500', origins)).toBe(true);
    expect(isOriginAllowed('http://localhost:5501', origins)).toBe(false);
  });
});
