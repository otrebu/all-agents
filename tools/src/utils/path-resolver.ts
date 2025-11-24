import path from 'path';
import fs from 'fs';

export function getContextRoot(): string {
  // 1. Priority: User explicit override
  if (process.env.ALL_AGENTS_CONTEXT) {
    return process.env.ALL_AGENTS_CONTEXT;
  }

  // 2. Priority: Relative to the executable (Self-contained repo/submodule)
  const binaryPath = process.argv[0]; // /path/to/all-agents/bin/ai-agent
  const binaryDir = path.dirname(binaryPath);
  
  // Check ../context (Repo structure)
  const repoContext = path.resolve(binaryDir, '../context');
  if (fs.existsSync(repoContext)) {
    return repoContext;
  }

  // 3. Priority: Symlinked binary scenario (resolve real path)
  try {
      const realBinaryPath = fs.realpathSync(binaryPath);
      const realBinaryDir = path.dirname(realBinaryPath);
      const symlinkContext = path.resolve(realBinaryDir, '../context');
      if (fs.existsSync(symlinkContext)) {
          return symlinkContext;
      }
  } catch (e) {
      // ignore symlink errors
  }

  // Fallback: checks if we are in dev mode (cwd)
  const cwdContext = path.resolve(process.cwd(), 'context');
  if (fs.existsSync(cwdContext)) {
      return cwdContext;
  }
  
  throw new Error(`
    Could not locate 'context' directory. 
    Expected it at ../context relative to the 'ai-agent' binary.
    Or set ALL_AGENTS_CONTEXT environment variable.
  `);
}
