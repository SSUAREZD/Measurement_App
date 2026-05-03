const host = typeof window !== 'undefined' ? window.location.host : 'localhost:4000';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

export const environment = {
  production: true,
  apiUrl: '/api',
  appUrl: `${protocol}//${host}`,
};
