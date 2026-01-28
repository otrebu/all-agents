const pty = require('node-pty');
const os = require('os');
const readline = require('readline');

// ============================================================
// FULL INTERACTIVE EXAMPLE WITH node-pty
// ============================================================
// This is the proper way to spawn interactive CLI programs
// that need full terminal capabilities

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

console.log('Starting interactive PTY session...');
console.log('Type "exit" to quit\n');

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
  cwd: process.cwd(),
  env: process.env
});

// Handle output from PTY
ptyProcess.onData((data) => {
  process.stdout.write(data);
});

// Handle input from user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Forward stdin to PTY
process.stdin.on('data', (data) => {
  ptyProcess.write(data);
});

// Handle resize events
process.stdout.on('resize', () => {
  const { columns, rows } = process.stdout;
  ptyProcess.resize(columns, rows);
});

// Handle PTY exit
ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`\nPTY exited with code ${exitCode}`);
  process.exit(exitCode);
});

// Handle parent process exit
process.on('SIGINT', () => {
  ptyProcess.kill();
  process.exit(0);
});

// ============================================================
// EXAMPLE: Running specific interactive commands
// ============================================================

function runInteractiveCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: process.env
    });

    let output = '';

    proc.onData((data) => {
      output += data;
      process.stdout.write(data);
    });

    proc.onExit(({ exitCode }) => {
      if (exitCode === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command exited with code ${exitCode}`));
      }
    });

    // Handle user input
    process.stdin.pipe(proc);
  });
}

// Example usage:
// runInteractiveCommand('npm', ['init'])
//   .then(() => console.log('Done!'))
//   .catch(err => console.error('Error:', err));

// ============================================================
// WHY node-pty IS NECESSARY
// ============================================================
/*
Many CLI programs check if they're running in a TTY:

  if (process.stdin.isTTY) {
    // Enable interactive features
    // Show colors, progress bars, prompts
  } else {
    // Run in non-interactive mode
    // Plain output, no prompts
  }

With regular spawn() + inherit:
  - isTTY = undefined (falsey)
  - Programs run in "pipe" mode
  - No colors, no interactive prompts
  - Some programs exit immediately

With node-pty:
  - isTTY = true
  - Programs think they're in a real terminal
  - Full interactive features work
  - Colors, readline, cursor movement all work
*/
