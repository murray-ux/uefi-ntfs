/**
 * MABUL MCP TOOLS INTERFACE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Model Context Protocol (MCP) compatible tools for the MABUL persistence layer
 * Enables integration with Claude and other MCP-compatible AI systems
 *
 * Tools:
 *   - memory_store: Store a memory with optional encryption
 *   - memory_retrieve: Retrieve a memory by key
 *   - memory_search: Semantic search across memories
 *   - memory_context: Build context for prompts
 *   - memory_checkpoint: Create/restore checkpoints
 *   - memory_health: System health check
 *
 * @module MABUL/MCP
 * @version 2.0.0
 */

import Mabul from './mabul-persistence.js';

// Singleton instance
let mabulInstance = null;

/**
 * Get or create the MABUL instance
 */
async function getMabul(options = {}) {
  if (!mabulInstance) {
    mabulInstance = new Mabul(options);
    await mabulInstance.initialize();
  }
  return mabulInstance;
}

// ══════════════════════════════════════════════════════════════════════════════
// MCP TOOL DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export const MCP_TOOLS = {
  memory_store: {
    name: 'memory_store',
    description: 'Store information in persistent memory with semantic indexing. Use this to remember important facts, user preferences, project context, or any information that should persist across sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Unique identifier for this memory (e.g., "user:preference:theme", "project:context:architecture")'
        },
        content: {
          type: 'string',
          description: 'The content to store. Can be facts, notes, code snippets, or any text.'
        },
        category: {
          type: 'string',
          description: 'Category for organization (e.g., "preference", "fact", "context", "code")',
          default: 'general'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for filtering and search'
        },
        encrypt: {
          type: 'boolean',
          description: 'Whether to encrypt this memory',
          default: false
        }
      },
      required: ['key', 'content']
    }
  },

  memory_retrieve: {
    name: 'memory_retrieve',
    description: 'Retrieve a specific memory by its key. Use this to recall previously stored information.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory to retrieve'
        }
      },
      required: ['key']
    }
  },

  memory_search: {
    name: 'memory_search',
    description: 'Search memories using semantic similarity. Use this to find relevant information based on a query, even if the exact words differ.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (semantic search)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5
        },
        threshold: {
          type: 'number',
          description: 'Minimum similarity threshold (0-1)',
          default: 0.3
        },
        category: {
          type: 'string',
          description: 'Filter by category'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (must have all specified tags)'
        }
      },
      required: ['query']
    }
  },

  memory_context: {
    name: 'memory_context',
    description: 'Build a context string from relevant memories for use in prompts. Combines semantic search with recent memories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query to find relevant memories'
        },
        maxItems: {
          type: 'number',
          description: 'Maximum number of memories to include',
          default: 10
        },
        recentWindow: {
          type: 'number',
          description: 'Include memories from the last N milliseconds',
          default: 3600000
        }
      },
      required: ['query']
    }
  },

  memory_list: {
    name: 'memory_list',
    description: 'List all stored memories with optional filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        since: {
          type: 'number',
          description: 'Only memories after this timestamp (ms)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 50
        }
      }
    }
  },

  memory_delete: {
    name: 'memory_delete',
    description: 'Delete a memory by its key.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory to delete'
        }
      },
      required: ['key']
    }
  },

  memory_checkpoint: {
    name: 'memory_checkpoint',
    description: 'Create or restore a checkpoint of the memory state. Useful for saving state before major changes.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'restore', 'list'],
          description: 'Action to perform'
        },
        name: {
          type: 'string',
          description: 'Checkpoint name (for create/restore)'
        }
      },
      required: ['action']
    }
  },

  memory_health: {
    name: 'memory_health',
    description: 'Check the health and status of the memory system.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  memory_covenant: {
    name: 'memory_covenant',
    description: 'Create or verify a covenant (trusted state assertion) for data integrity.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'verify', 'list'],
          description: 'Action to perform'
        },
        name: {
          type: 'string',
          description: 'Covenant name (for create)'
        },
        conditions: {
          type: 'array',
          description: 'Conditions for the covenant (for create)',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['exists', 'count', 'integrity'] },
              key: { type: 'string' },
              filter: { type: 'object' },
              min: { type: 'number' },
              max: { type: 'number' }
            }
          }
        },
        covenantId: {
          type: 'string',
          description: 'Covenant ID (for verify)'
        }
      },
      required: ['action']
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MCP TOOL HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

export const MCP_HANDLERS = {
  async memory_store(params) {
    const mabul = await getMabul();
    const { key, content, category, tags, encrypt } = params;

    let value = content;

    // Encrypt if requested
    if (encrypt && mabul.encryption.masterKey) {
      value = mabul.encryption.seal(content);
    }

    const record = await mabul.store(key, value, { category, tags });

    return {
      success: true,
      key: record.id,
      timestamp: record.timestamp,
      encrypted: encrypt && mabul.encryption.masterKey ? true : false
    };
  },

  async memory_retrieve(params) {
    const mabul = await getMabul();
    const { key } = params;

    const record = await mabul.retrieve(key);

    if (!record) {
      return { success: false, error: 'Memory not found' };
    }

    // Auto-decrypt if needed
    let value = record.value;
    if (value && value.sealed && mabul.encryption.masterKey) {
      try {
        value = mabul.encryption.unseal(value);
      } catch {
        // Return sealed if decryption fails
      }
    }

    return {
      success: true,
      key: record.id,
      value,
      category: record.category,
      tags: record.tags,
      timestamp: record.timestamp
    };
  },

  async memory_search(params) {
    const mabul = await getMabul();
    const { query, limit, threshold, category, tags } = params;

    let results = await mabul.search(query, { limit, threshold });

    // Apply additional filters
    if (category) {
      results = results.filter(r => r.category === category);
    }
    if (tags && tags.length > 0) {
      results = results.filter(r => tags.every(t => r.tags.includes(t)));
    }

    return {
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        key: r.id,
        value: r.value,
        category: r.category,
        tags: r.tags,
        similarity: r.similarity,
        timestamp: r.timestamp
      }))
    };
  },

  async memory_context(params) {
    const mabul = await getMabul();
    const { query, maxItems, recentWindow } = params;

    const context = await mabul.buildContext(query, {
      maxContext: maxItems,
      recentWindow
    });

    return {
      success: true,
      query,
      contextItems: context.contextItems,
      context: context.context
    };
  },

  async memory_list(params) {
    const mabul = await getMabul();
    const { category, tags, since, limit } = params;

    let results = await mabul.ark.list({ category, tags, since });

    if (limit) {
      results = results.slice(0, limit);
    }

    return {
      success: true,
      count: results.length,
      memories: results.map(r => ({
        key: r.id,
        category: r.category,
        tags: r.tags,
        timestamp: r.timestamp,
        preview: typeof r.value === 'string' ?
          r.value.slice(0, 100) + (r.value.length > 100 ? '...' : '') :
          '[object]'
      }))
    };
  },

  async memory_delete(params) {
    const mabul = await getMabul();
    const { key } = params;

    const existed = await mabul.ark.delete(key);

    return {
      success: true,
      deleted: existed,
      key
    };
  },

  async memory_checkpoint(params) {
    const mabul = await getMabul();
    const { action, name } = params;

    switch (action) {
      case 'create': {
        const checkpoint = await mabul.createCheckpoint(name);
        return {
          success: true,
          action: 'created',
          checkpoint: {
            id: checkpoint.id,
            timestamp: checkpoint.timestamp,
            memoriesCount: checkpoint.memoriesCount
          }
        };
      }

      case 'restore': {
        if (!name) {
          return { success: false, error: 'Checkpoint name required for restore' };
        }
        const restored = await mabul.checkpoint.restoreCheckpoint(name);
        return {
          success: true,
          action: 'restored',
          checkpoint: {
            id: restored.id,
            memoriesCount: restored.memoriesCount
          }
        };
      }

      case 'list': {
        const checkpoints = await mabul.checkpoint.listCheckpoints();
        return {
          success: true,
          action: 'list',
          count: checkpoints.length,
          checkpoints
        };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  },

  async memory_health(params) {
    const mabul = await getMabul();
    const status = await mabul.status();
    const health = await mabul.health();

    return {
      success: true,
      status,
      health
    };
  },

  async memory_covenant(params) {
    const mabul = await getMabul();
    const { action, name, conditions, covenantId } = params;

    switch (action) {
      case 'create': {
        if (!name || !conditions) {
          return { success: false, error: 'Name and conditions required for create' };
        }
        const covenant = await mabul.covenant.createCovenant(name, conditions);
        return {
          success: true,
          action: 'created',
          covenant: {
            id: covenant.id,
            name: covenant.name,
            signature: covenant.signature
          }
        };
      }

      case 'verify': {
        if (!covenantId) {
          return { success: false, error: 'Covenant ID required for verify' };
        }
        const result = await mabul.covenant.verifyCovenant(covenantId);
        return {
          success: true,
          action: 'verified',
          result
        };
      }

      case 'list': {
        const covenants = mabul.ark.metadata.covenants || [];
        return {
          success: true,
          action: 'list',
          count: covenants.length,
          covenants
        };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MCP SERVER SETUP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create MCP server configuration
 */
export function createMCPServer(options = {}) {
  return {
    name: 'genesis-mabul',
    version: '2.0.0',
    description: 'GENESIS MABUL — Persistent Memory Layer for AI Systems',
    tools: Object.values(MCP_TOOLS),

    async handleToolCall(name, params) {
      const handler = MCP_HANDLERS[name];
      if (!handler) {
        return { success: false, error: `Unknown tool: ${name}` };
      }

      try {
        return await handler(params);
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS FOR AUTO-CAPTURE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Setup automatic memory capture hooks
 */
export async function setupAutoCaptureHooks(options = {}) {
  const mabul = await getMabul(options);

  // Hook for capturing conversation turns
  const captureConversation = async (role, content) => {
    const key = `conv:${role}:${Date.now()}`;
    await mabul.messenger.send(content, {
      key,
      category: 'conversation',
      tags: ['auto-captured', role]
    });
  };

  // Hook for capturing tool results
  const captureToolResult = async (toolName, result) => {
    const key = `tool:${toolName}:${Date.now()}`;
    await mabul.store(key, {
      tool: toolName,
      result: typeof result === 'string' ? result : JSON.stringify(result)
    }, {
      category: 'tool-result',
      tags: ['auto-captured', 'tool', toolName]
    });
  };

  // Hook for capturing errors
  const captureError = async (error, context = {}) => {
    const key = `error:${Date.now()}`;
    await mabul.store(key, {
      message: error.message,
      stack: error.stack,
      context
    }, {
      category: 'error',
      tags: ['auto-captured', 'error']
    });
  };

  return {
    captureConversation,
    captureToolResult,
    captureError,
    mabul
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default {
  MCP_TOOLS,
  MCP_HANDLERS,
  createMCPServer,
  setupAutoCaptureHooks,
  getMabul
};
