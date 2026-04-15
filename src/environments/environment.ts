const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

export const environment = {
  production: false,
  apiUrl: '/api',
  appUrl: `${protocol}//${host}:4202`,
};
