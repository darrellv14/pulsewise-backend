const { spawn } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.AUTH_RECHECK_USER = process.env.AUTH_RECHECK_USER || 'false';
process.env.OTP_DEBUG_EXPOSE = process.env.OTP_DEBUG_EXPOSE || 'true';

const jestBin = path.join(__dirname, '..', '..', 'node_modules', 'jest', 'bin', 'jest.js');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [jestBin, '--runInBand', ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
