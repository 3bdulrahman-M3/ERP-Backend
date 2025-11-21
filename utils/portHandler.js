const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const killPort = async (port) => {
  try {
    // Find process using the port
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    
    if (!stdout || stdout.trim() === '') {
      return { success: true, message: `Port ${port} is free` };
    }

    // Extract PIDs
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });

    if (pids.size === 0) {
      return { success: true, message: `Port ${port} is free` };
    }

    // Kill all processes
    const killedPids = [];
    for (const pid of pids) {
      try {
        await execPromise(`taskkill /PID ${pid} /F`);
        killedPids.push(pid);
      } catch (error) {
        // Process might already be killed
      }
    }

    return { 
      success: true, 
      message: `Killed ${killedPids.length} process(es) on port ${port}`,
      pids: killedPids
    };
  } catch (error) {
    if (error.code === 1) {
      // No process found (netstat returns 1 when no matches)
      return { success: true, message: `Port ${port} is free` };
    }
    return { success: false, error: error.message };
  }
};

module.exports = { killPort };

