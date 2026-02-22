#!/usr/bin/env node
/**
 * GENESIS SESSION END HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: SessionEnd
 * Cleanup and persist session state
 *
 * Input (stdin): JSON with { sessionId, summary }
 * Output (stdout): JSON with { action: 'continue' }
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.genesis', 'sessions');

async function processSessionEnd() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const sessionId = data.sessionId || 'unknown';
    const summary = data.summary || {};

    const sessionFile = join(SESSION_DIR, `${sessionId}.json`);

    let session = { id: sessionId };

    // Load existing session if available
    if (existsSync(sessionFile)) {
      try {
        session = JSON.parse(readFileSync(sessionFile, 'utf8'));
      } catch {
        // Use default session
      }
    }

    // Update session with end data
    session.endedAt = new Date().toISOString();
    session.endTimestamp = Date.now();
    session.duration = session.startTimestamp ?
      session.endTimestamp - session.startTimestamp : null;
    session.summary = summary;
    session.status = 'completed';

    // Calculate statistics
    if (session.duration) {
      session.statistics = {
        durationMs: session.duration,
        durationFormatted: formatDuration(session.duration),
        promptsPerMinute: session.hooks?.promptCount ?
          (session.hooks.promptCount / (session.duration / 60000)).toFixed(2) : 0
      };
    }

    // Save updated session
    writeFileSync(sessionFile, JSON.stringify(session, null, 2));

    console.error(`[GENESIS] Session ended: ${sessionId}`);
    console.error(`[GENESIS] Duration: ${session.statistics?.durationFormatted || 'unknown'}`);

    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:session-end',
      sessionSummary: {
        id: sessionId,
        duration: session.statistics?.durationFormatted,
        promptCount: session.hooks?.promptCount || 0,
        toolCount: session.hooks?.toolCount || 0
      }
    }));

  } catch (error) {
    console.error(`[GENESIS ERROR] SessionEnd: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:session-end'
    }));
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

processSessionEnd();
