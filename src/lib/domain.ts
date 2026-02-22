/**
 * src/lib/domain.ts
 * Utility to extract and identify the current active subdomain.
 */

export type Subdomain = 'admin' | 'agent' | 'apply';

export function getSubdomain(): Subdomain {
  const hostname = window.location.hostname;

  // Handle local development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    // Determine based on port (e.g., 8081 = admin, 8082 = agent)
    const port = window.location.port;
    if (port === '8083') return 'apply';
    if (port === '8082') return 'agent';
    if (port === '8081') return 'admin';
    
    // Fallback to environment variable or admin default
    const localDevSubdomain = import.meta.env.VITE_LOCAL_SUBDOMAIN as Subdomain | undefined;
    return localDevSubdomain || 'admin';
  }

  // Handle Production/Staging subdomains (e.g., admin.agendamoney.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (sub === 'admin' || sub === 'agent' || sub === 'apply') {
      return sub as Subdomain;
    }
  }

  // Fallback default for unknown prod structures (e.g. naked domain)
  return 'admin';
}
