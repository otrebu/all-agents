const { spawn, spawnSync } = require('child_process');

// ============================================================
// APPROACH 1: spawnSync with inherit (NOT for interactive use)
// ============================================================
// Blocks event loop - only for non-interactive commands
console.log('=== spawnSync (blocking) ===');
try {
  const result = spawnSync('ls', ['-la'], { stdio: 'inherit' });
  console.log('Exit code:', result.status);
} catch (err) {
  console.error('Error:', err);
}

// ============================================================
// APPROACH 2: spawn with inherit (Basic interactivity)
// ============================================================
// Good for: Simple commands that need user input/output
// Bad for: Programs that check isTTY (colors, readline, vim)
console.log('\n=== spawn with inherit ===');
const child1 = spawn('cat', [], { stdio: 'inherit' });

child1.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
});

// Note: With stdio: 'inherit', the child takes over stdin/stdout
// The parent cannot intercept or modify the data

// ============================================================
// APPROACH 3: spawn with pipe (Manual handling)
// ============================================================
// Good for: Processing/transforming output, logging
// Bad for: Interactive programs (no TTY)
console.log('\n=== spawn with pipe ===');
const child2 = spawn('ls', ['-la'], { stdio: 'pipe' });

child2.stdout.on('data', (data) => {
  process.stdout.write(`[LOG] ${data}`);
});

child2.stderr.on('data', (data) => {
  process.stderr.write(`[ERROR] ${data}`);
});

// Manually pipe stdin (but not a real TTY)
process.stdin.pipe(child2.stdin);

// ============================================================
// APPROACH 4: spawn with detached (Independent process)
// ============================================================
// Good for: Long-running processes that should outlive parent
console.log('\n=== spawn detached ===');
const child3 = spawn('sleep', ['10'], {
  detached: true,
  stdio: 'ignore'
});

child3.unref(); // Allow parent to exit independently
console.log(`Detached process PID: ${child3.pid}`);

// ============================================================
// APPROACH 5: PTY with node-pty (Full interactivity)
// ============================================================
// This requires: npm install node-pty
// Best for: vim, htop, interactive prompts, any TTY-dependent program

/*
const pty = require('node-pty');
const os = require('os');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Forward data between PTY and parent stdio
ptyProcess.onData((data) => {
  process.stdout.write(data);
});

process.stdin.on('data', (data) => {
  ptyProcess.write(data);
});

// Resize handling
process.on('SIGWINCH', () => {
  const { columns, rows } = process.stdout;
  ptyProcess.resize(columns, rows);
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`PTY exited with code ${exitCode}, signal ${signal}`);
  process.exit(exitCode);
});
*/

// ============================================================
// COMPARISON SUMMARY
// ============================================================
/*
┌─────────────────────┬──────────────┬─────────────┬─────────────┬──────────────┐
│ Feature             │ spawnSync    │ spawn       │ spawn       │ node-pty     │
│                     │ inherit      │ inherit     │ pipe        │              │
├─────────────────────┼──────────────┼─────────────┼─────────────┼──────────────┤
│ Non-blocking        │ ❌ No        │ ✅ Yes      │ ✅ Yes      │ ✅ Yes       │
│ Event loop          │ Blocks       │ Free        │ Free        │ Free         │
│ TTY emulation       │ ❌ No        │ ❌ No       │ ❌ No       │ ✅ Yes       │
│ Colors/progress     │ ❌ No        │ Partial     │ ❌ No       │ ✅ Yes       │
│ Interactive input   │ ❌ No        │ Basic       │ Manual      │ ✅ Full      │
│ Process output      │ ❌ Can't     │ ❌ Can't    │ ✅ Can      │ ✅ Can       │
│ Complex programs    │ ❌ No        │ Partial     │ ❌ No       │ ✅ Yes       │
│ (vim, htop)         │              │             │             │              │
└─────────────────────┴──────────────┴─────────────┴─────────────┴──────────────┘
*/

// ============================================================
// WHEN TO USE EACH APPROACH
// ============================================================
/*
1. spawnSync + inherit:
   - Simple, non-interactive commands
   - When you need the result before continuing
   - Scripts that run sequentially

2. spawn + inherit:
   - Commands that need basic user interaction
   - When you don't need to process output
   - Simple prompts (if program doesn't check isTTY)

3. spawn + pipe:
   - Processing/transforming output
   - Logging command output
   - Non-interactive data processing

4. spawn + detached:
   - Background processes
   - Daemons that should outlive parent
   - Long-running tasks

5. node-pty:
   - Full terminal emulation needed
   - Running vim, htop, or other TTY programs
   - When child checks process.stdin.isTTY
   - Preserving colors, progress bars, cursor movement
*/
