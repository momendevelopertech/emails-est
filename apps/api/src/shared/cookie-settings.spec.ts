import { getAllowedOrigins, getFrontendOrigin } from './cookie-settings';

describe('cookie-settings origin normalization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('normalizes FRONTEND_URL with trailing slash to an origin', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://emails-est-web.vercel.app/';

    expect(getFrontendOrigin()).toBe('https://emails-est-web.vercel.app');
    expect(getAllowedOrigins()).toContain('https://emails-est-web.vercel.app');
  });

  it('normalizes FRONTEND_URL with path segment to an origin', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://emails-est-web.vercel.app/en/login';

    expect(getFrontendOrigin()).toBe('https://emails-est-web.vercel.app');
  });
});
