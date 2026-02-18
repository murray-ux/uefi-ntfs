/**
 * GENESIS 2.0 - AI Assistant Screen
 * Multi-provider AI chat with security focus
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { colors, textStyles, spacing, borderRadius } from '../theme';
import {
  useAIStore,
  useCurrentConversation,
  useMessages,
  ChatMessage,
  QuickAction,
} from '../store/aiStore';

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.assistantHeader}>
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={16} color={colors.cyan[500]} />
          </View>
          <Text style={styles.assistantLabel}>GENESIS AI</Text>
          {message.provider && (
            <Text style={styles.providerBadge}>{message.provider.toUpperCase()}</Text>
          )}
        </View>
      )}

      <Text style={[styles.messageText, isUser && styles.userMessageText]}>
        {message.content}
      </Text>

      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {!isUser && (
          <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={14} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {message.error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={12} color={colors.red[500]} />
          <Text style={styles.errorText}>{message.error}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// Quick action chip
function QuickActionChip({ action, onPress }: { action: QuickAction; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionChip} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={action.icon as any} size={16} color={colors.cyan[500]} />
      <Text style={styles.quickActionText}>{action.name}</Text>
    </TouchableOpacity>
  );
}

// Provider selector
function ProviderSelector() {
  const { currentProvider, availableProviders, setProvider, isOnline } = useAIStore();

  const providerIcons: Record<string, string> = {
    anthropic: 'logo-electron',
    openai: 'logo-apple-ar',
    ollama: 'server',
    offline: 'cloud-offline',
  };

  const providerColors: Record<string, string> = {
    anthropic: colors.orange[500],
    openai: colors.green[500],
    ollama: colors.purple[500],
    offline: colors.text.muted,
  };

  return (
    <View style={styles.providerSelector}>
      {availableProviders.map((provider) => (
        <TouchableOpacity
          key={provider}
          style={[
            styles.providerButton,
            currentProvider === provider && styles.providerButtonActive,
            !isOnline && provider !== 'offline' && styles.providerButtonDisabled,
          ]}
          onPress={() => {
            if (isOnline || provider === 'offline') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setProvider(provider);
            }
          }}
          disabled={!isOnline && provider !== 'offline'}
        >
          <Ionicons
            name={providerIcons[provider] as any}
            size={16}
            color={currentProvider === provider ? providerColors[provider] : colors.text.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Empty state
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[colors.cyan[500], colors.magenta[500]]}
        style={styles.emptyStateIcon}
      >
        <Ionicons name="sparkles" size={32} color={colors.text.primary} />
      </LinearGradient>
      <Text style={styles.emptyStateTitle}>GENESIS AI Assistant</Text>
      <Text style={styles.emptyStateSubtitle}>
        Security-focused AI powered by Claude, GPT-4, or local models
      </Text>
      <View style={styles.emptyStateFeatures}>
        <Text style={styles.featureItem}>Security analysis & threat assessment</Text>
        <Text style={styles.featureItem}>Policy drafting & compliance checks</Text>
        <Text style={styles.featureItem}>Incident response guidance</Text>
        <Text style={styles.featureItem}>Code security review</Text>
      </View>
    </View>
  );
}

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);

  const {
    isLoading,
    quickActions,
    sendMessage,
    createConversation,
    currentConversationId,
  } = useAIStore();
  const messages = useMessages();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Hide quick actions when typing
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setShowQuickActions(false);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setShowQuickActions(true);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');

    if (!currentConversationId) {
      createConversation();
    }

    await sendMessage(text);
  }, [inputText, isLoading, currentConversationId, createConversation, sendMessage]);

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (action.requiresInput) {
        setInputText(action.prompt);
        inputRef.current?.focus();
      } else {
        if (!currentConversationId) {
          createConversation();
        }
        await sendMessage(action.prompt);
      }
    },
    [currentConversationId, createConversation, sendMessage]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <ProviderSelector />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.emptyMessagesList,
        ]}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Quick Actions */}
      {showQuickActions && messages.length === 0 && (
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <FlatList
            horizontal
            data={quickActions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <QuickActionChip action={item} onPress={() => handleQuickAction(item)} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsList}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing[2] }]}>
        <BlurView intensity={40} tint="dark" style={styles.inputBlur}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="attach" size={22} color={colors.text.muted} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask GENESIS AI..."
              placeholderTextColor={colors.text.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingDots}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
                  <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
                </View>
              ) : (
                <LinearGradient
                  colors={
                    inputText.trim()
                      ? [colors.cyan[500], colors.cyan[600]]
                      : [colors.text.muted, colors.text.muted]
                  }
                  style={styles.sendButtonGradient}
                >
                  <Ionicons name="send" size={18} color={colors.text.primary} />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{inputText.length}/4000</Text>
            <Text style={styles.modelInfo}>claude-3-sonnet</Text>
          </View>
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  providerSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  providerButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  providerButtonActive: {
    borderColor: colors.cyan[500],
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  providerButtonDisabled: {
    opacity: 0.3,
  },
  messagesList: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  emptyMessagesList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.cyan[500],
    borderBottomRightRadius: spacing[1],
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderBottomLeftRadius: spacing[1],
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  assistantLabel: {
    ...textStyles.label,
    color: colors.cyan[500],
    fontSize: 10,
  },
  providerBadge: {
    ...textStyles.badge,
    color: colors.text.muted,
    marginLeft: spacing[2],
    fontSize: 8,
  },
  messageText: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  userMessageText: {
    color: colors.text.inverse,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  messageTime: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
  copyButton: {
    padding: spacing[1],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: spacing[2],
    borderRadius: borderRadius.sm,
    marginTop: spacing[2],
    gap: spacing[1],
  },
  errorText: {
    ...textStyles.caption,
    color: colors.red[500],
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyStateTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyStateSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  emptyStateFeatures: {
    alignItems: 'flex-start',
  },
  featureItem: {
    ...textStyles.bodySmall,
    color: colors.text.muted,
    marginVertical: spacing[1],
  },
  quickActionsContainer: {
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  quickActionsTitle: {
    ...textStyles.label,
    color: colors.text.muted,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  quickActionsList: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.glass,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing[2],
    marginRight: spacing[2],
  },
  quickActionText: {
    ...textStyles.bodySmall,
    color: colors.text.primary,
  },
  inputContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  inputBlur: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[2],
    gap: spacing[2],
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...textStyles.body,
    color: colors.text.primary,
    maxHeight: 100,
    paddingVertical: spacing[2],
  },
  sendButton: {
    width: 36,
    height: 36,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan[500],
    opacity: 0.3,
  },
  loadingDotDelay1: {
    opacity: 0.6,
  },
  loadingDotDelay2: {
    opacity: 1,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
  },
  charCount: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
  modelInfo: {
    ...textStyles.caption,
    color: colors.cyan[500],
    fontSize: 10,
  },
});
