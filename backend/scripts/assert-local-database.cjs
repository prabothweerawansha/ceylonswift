const { URL } = require('node:url');

const databaseUrl = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';

if (!databaseUrl) {
  console.error('DATABASE_URL is required before running a development migration.');
  process.exit(1);
}

if (nodeEnv === 'production') {
  console.error('Development migration commands are disabled in production.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is not a valid URL.');
  process.exit(1);
}

const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);
const databaseName = parsed.pathname.replace(/^\//, '');
const approvedName = databaseName.endsWith('_dev') || databaseName.endsWith('_test');

if (!allowedHosts.has(parsed.hostname) || !approvedName) {
  console.error('Refusing migration: host must be local and database name must end in _dev or _test.');
  process.exit(1);
}

console.log(`Local database safety check passed for ${parsed.hostname}/${databaseName}.`);
