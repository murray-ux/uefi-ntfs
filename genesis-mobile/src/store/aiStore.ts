/**
 * GENESIS 2.0 - AI Chat Store
 * Multi-provider AI assistant state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'offline';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  provider?: AIProvider;
  model?: string;
  tokens?: number;
  isStreaming?: boolean;
  error?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'code' | 'evidence';
  name: string;
  uri: string;
  mimeType: string;
  size: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  provider: AIProvider;
  model: string;
  systemPrompt?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export interface AIState {
  // Provider state
  currentProvider: AIProvider;
  availableProviders: AIProvider[];
  isOnline: boolean;

  // Model state
  currentModel: string;
  availableModels: AIModel[];

  // Conversation state
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Quick actions
  quickActions: QuickAction[];

  // Actions
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setOnline: (online: boolean) => void;

  // Conversation actions
  createConversation: (title?: string, systemPrompt?: string) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversations: () => void;

  // Message actions
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  stopStreaming: () => void;
  deleteMessage: (conversationId: string, messageId: string) => void;

  // Quick action
  executeQuickAction: (actionId: string, input?: string) => Promise<string>;

  // Initialization
  initAI: () => Promise<void>;
  checkProviders: () => Promise<void>;
}

export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  requiresInput: boolean;
  inputPlaceholder?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

// Default quick actions
const defaultQuickActions: QuickAction[] = [
  {
    id: 'summarize',
    name: 'Summarize',
    icon: 'document-text',
    prompt: 'Please summarize the following:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Paste text to summarize...',
  },
  {
    id: 'security-analysis',
    name: 'Security Analysis',
    icon: 'shield',
    prompt: 'Analyze the following for security vulnerabilities and risks:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Paste code or config...',
  },
  {
    id: 'explain-code',
    name: 'Explain Code',
    icon: 'code',
    prompt: 'Explain this code in detail:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Paste code to explain...',
  },
  {
    id: 'draft-policy',
    name: 'Draft Policy',
    icon: 'document',
    prompt: 'Draft a security policy for:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Describe the policy scope...',
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    icon: 'alert-circle',
    prompt: 'Provide incident response steps for:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Describe the incident...',
  },
  {
    id: 'compliance-check',
    name: 'Compliance Check',
    icon: 'checkmark-circle',
    prompt: 'Check compliance requirements for:\n\n',
    requiresInput: true,
    inputPlaceholder: 'Describe compliance scope...',
  },
];

// Default models
const defaultModels: AIModel[] = [
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most capable model for complex tasks',
    maxTokens: 200000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance and speed',
    maxTokens: 200000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'OpenAI flagship model',
    maxTokens: 128000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Optimized GPT-4 variant',
    maxTokens: 128000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'llama3:70b',
    name: 'Llama 3 70B',
    provider: 'ollama',
    description: 'Local open-source model',
    maxTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
  },
  {
    id: 'offline-fallback',
    name: 'Offline Mode',
    provider: 'offline',
    description: 'Basic responses without internet',
    maxTokens: 1000,
    supportsVision: false,
    supportsStreaming: false,
  },
];

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProvider: 'anthropic',
      availableProviders: ['anthropic', 'openai', 'ollama', 'offline'],
      isOnline: true,
      currentModel: 'claude-3-sonnet',
      availableModels: defaultModels,
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      quickActions: defaultQuickActions,

      // Provider actions
      setProvider: (provider) => {
        const models = get().availableModels.filter((m) => m.provider === provider);
        set({
          currentProvider: provider,
          currentModel: models[0]?.id || 'offline-fallback',
        });
      },

      setModel: (model) => set({ currentModel: model }),
      setOnline: (online) => set({ isOnline: online }),

      // Conversation actions
      createConversation: (title, systemPrompt) => {
        const { currentProvider, currentModel } = get();
        const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newConversation: Conversation = {
          id,
          title: title || 'New Conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          provider: currentProvider,
          model: currentModel,
          systemPrompt,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      selectConversation: (id) => set({ currentConversationId: id }),

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
        }));
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      clearConversations: () => set({ conversations: [], currentConversationId: null }),

      // Message actions
      sendMessage: async (content, attachments) => {
        let { currentConversationId, conversations, currentProvider, currentModel } = get();

        // Create conversation if none exists
        if (!currentConversationId) {
          currentConversationId = get().createConversation();
        }

        const conversation = conversations.find((c) => c.id === currentConversationId);
        if (!conversation) return;

        // Create user message
        const userMessage: ChatMessage = {
          id: `msg-${Date.now()}-user`,
          role: 'user',
          content,
          timestamp: Date.now(),
          attachments,
        };

        // Add user message
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === currentConversationId
              ? {
                  ...c,
                  messages: [...c.messages, userMessage],
                  updatedAt: Date.now(),
                }
              : c
          ),
          isLoading: true,
        }));

        try {
          // Prepare messages for API
          const messages = [...conversation.messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          }));

          // Call AI API
          const response = await fetch(`${API_BASE}/ai/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages,
              provider: currentProvider,
              model: currentModel,
              systemPrompt: conversation.systemPrompt,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'AI request failed');
          }

          // Create assistant message
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: data.content || data.response,
            timestamp: Date.now(),
            provider: currentProvider,
            model: currentModel,
            tokens: data.tokens,
          };

          // Add assistant message
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === currentConversationId
                ? {
                    ...c,
                    messages: [...c.messages, assistantMessage],
                    updatedAt: Date.now(),
                    title:
                      c.messages.length === 0
                        ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
                        : c.title,
                  }
                : c
            ),
            isLoading: false,
          }));
        } catch (error) {
          // Add error message
          const errorMessage: ChatMessage = {
            id: `msg-${Date.now()}-error`,
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your request.',
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === currentConversationId
                ? { ...c, messages: [...c.messages, errorMessage] }
                : c
            ),
            isLoading: false,
          }));
        }
      },

      regenerateLastResponse: async () => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return;

        const conversation = conversations.find((c) => c.id === currentConversationId);
        if (!conversation || conversation.messages.length < 2) return;

        // Remove last assistant message
        const lastUserMessage = [...conversation.messages]
          .reverse()
          .find((m) => m.role === 'user');
        if (!lastUserMessage) return;

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === currentConversationId
              ? {
                  ...c,
                  messages: c.messages.slice(0, -1),
                }
              : c
          ),
        }));

        // Resend the last user message
        await get().sendMessage(lastUserMessage.content, lastUserMessage.attachments);
      },

      stopStreaming: () => {
        set({ isStreaming: false, streamingContent: '' });
      },

      deleteMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
              : c
          ),
        }));
      },

      // Quick actions
      executeQuickAction: async (actionId, input) => {
        const action = get().quickActions.find((a) => a.id === actionId);
        if (!action) throw new Error('Action not found');

        const fullPrompt = action.prompt + (input || '');
        await get().sendMessage(fullPrompt);

        const { currentConversationId, conversations } = get();
        const conversation = conversations.find((c) => c.id === currentConversationId);
        const lastMessage = conversation?.messages[conversation.messages.length - 1];

        return lastMessage?.content || '';
      },

      // Initialization
      initAI: async () => {
        await get().checkProviders();
      },

      checkProviders: async () => {
        const available: AIProvider[] = ['offline'];

        try {
          // Check Anthropic
          const anthropicRes = await fetch(`${API_BASE}/ai/providers/anthropic`);
          if (anthropicRes.ok) available.push('anthropic');
        } catch {
          /* Provider not available */
        }

        try {
          // Check OpenAI
          const openaiRes = await fetch(`${API_BASE}/ai/providers/openai`);
          if (openaiRes.ok) available.push('openai');
        } catch {
          /* Provider not available */
        }

        try {
          // Check Ollama
          const ollamaRes = await fetch(`${API_BASE}/ai/providers/ollama`);
          if (ollamaRes.ok) available.push('ollama');
        } catch {
          /* Provider not available */
        }

        set({
          availableProviders: available,
          isOnline: available.length > 1,
        });
      },
    }),
    {
      name: 'genesis-ai',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentProvider: state.currentProvider,
        currentModel: state.currentModel,
      }),
    }
  )
);

// Selector hooks
export const useCurrentConversation = () => {
  const { conversations, currentConversationId } = useAIStore();
  return conversations.find((c) => c.id === currentConversationId);
};

export const useMessages = () => {
  const conversation = useCurrentConversation();
  return conversation?.messages || [];
};
