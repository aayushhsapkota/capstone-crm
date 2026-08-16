import axios from 'axios';

// '/api' works locally because vite.config.js's dev-server proxy quietly forwards it
// to the real backend — that proxy is a dev-server-only feature and does nothing for
// the built static site, so a production deploy (Cloudflare Pages, etc.) needs the
// real backend origin baked in via VITE_API_BASE_URL at build time. Falls back to the
// relative path so local dev is unaffected.
const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

export default client;
