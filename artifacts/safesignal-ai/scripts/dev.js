const { spawn } = require('child_process');

const env = { ...process.env };

if (process.env.REPLIT_EXPO_DEV_DOMAIN) {
  env.EXPO_PACKAGER_PROXY_URL = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
}
if (process.env.REPLIT_DEV_DOMAIN) {
  env.EXPO_PUBLIC_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
  env.REACT_NATIVE_PACKAGER_HOSTNAME = process.env.REPLIT_DEV_DOMAIN;
}
if (process.env.REPL_ID) {
  env.EXPO_PUBLIC_REPL_ID = process.env.REPL_ID;
}

const port = process.env.PORT || '8081';
const args = ['exec', 'expo', 'start', '--localhost', '--port', port];

const child = spawn('pnpm', args, {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
