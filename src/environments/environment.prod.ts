const host = typeof window !== 'undefined' ? window.location.host : '3.134.98.147:4202';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

export const environment = {
  production: true,
  apiUrl: 'http://3.134.98.147:4202/',
  appUrl: `${protocol}//${host}`,
  recommendationAppUrl: 'http://3.134.98.147:4201/login',
};
