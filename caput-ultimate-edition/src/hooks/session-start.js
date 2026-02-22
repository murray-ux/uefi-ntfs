#!/usr/bin/env node
/**
 * GENESIS SESSION START HOOK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Claude Code Hook: SessionStart
 * Initialize session resources
 *
 * Input (stdin): JSON with { sessionId, metadata }
 * Output (stdout): JSON with { action: 'continue', sessionData? }
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Session storage directory
const SESSION_DIR = join(homedir(), '.genesis', 'sessions');

async function processSessionStart() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const sessionId = data.sessionId || `session-${Date.now()}`;
    const metadata = data.metadata || {};

    // Ensure session directory exists
    if (!existsSync(SESSION_DIR)) {
      mkdirSync(SESSION_DIR, { recursive: true });
    }

    // Create session record
    const session = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      startTimestamp: Date.now(),
      metadata,
      hooks: {
        promptCount: 0,
        toolCount: 0,
        errorCount: 0,
        blockCount: 0
      },
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        cwd: process.cwd()
      }
    };

    // Save session file
    const sessionFile = join(SESSION_DIR, `${sessionId}.json`);
    writeFileSync(sessionFile, JSON.stringify(session, null, 2));

    console.error(`[GENESIS] Session started: ${sessionId}`);
    console.error(`[GENESIS] Session file: ${sessionFile}`);

    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:session-start',
      sessionData: {
        id: sessionId,
        startedAt: session.startedAt,
        sessionFile
      }
    }));

  } catch (error) {
    console.error(`[GENESIS ERROR] SessionStart: ${error.message}`);
    console.log(JSON.stringify({
      action: 'continue',
      hookName: 'genesis:session-start'
    }));
  }
}

processSessionStart();
