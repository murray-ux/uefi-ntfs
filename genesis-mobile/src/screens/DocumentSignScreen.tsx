/**
 * GENESIS 2.0 - Document Sign Screen
 * Ed25519 document signing with camera
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius } from '../theme';

export default function DocumentSignScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [document, setDocument] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const pickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      setDocument({ name: result.assets[0].name, uri: result.assets[0].uri, type: 'document' });
      setSigned(false);
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setDocument({ name: 'Photo Capture', uri: result.assets[0].uri, type: 'image' });
      setSigned(false);
    }
  };

  const signDocument = async () => {
    if (!document) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSigning(true);
    // Simulate signing
    await new Promise((r) => setTimeout(r, 2000));
    setSigning(false);
    setSigned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background.primary, colors.background.secondary]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Document</Text>
        <Text style={styles.headerSubtitle}>Ed25519 Digital Signature</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}>
        {/* Upload options */}
        <View style={styles.uploadOptions}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
            <View style={[styles.uploadIcon, { backgroundColor: 'rgba(0,255,255,0.1)' }]}>
              <Ionicons name="document" size={32} color={colors.cyan[500]} />
            </View>
            <Text style={styles.uploadText}>Browse Files</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
            <View style={[styles.uploadIcon, { backgroundColor: 'rgba(255,0,255,0.1)' }]}>
              <Ionicons name="camera" size={32} color={colors.magenta[500]} />
            </View>
            <Text style={styles.uploadText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Document preview */}
        {document && (
          <View style={styles.previewCard}>
            <BlurView intensity={20} tint="dark" style={styles.previewBlur}>
              {document.type === 'image' ? (
                <Image source={{ uri: document.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.documentPreview}>
                  <Ionicons name="document-text" size={48} color={colors.cyan[500]} />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewName} numberOfLines={1}>{document.name}</Text>
                {signed && (
                  <View style={styles.signedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.green[500]} />
                    <Text style={styles.signedText}>Signed</Text>
                  </View>
                )}
              </View>
            </BlurView>
          </View>
        )}

        {/* Signature info */}
        <View style={styles.signatureInfo}>
          <Text style={styles.infoTitle}>Signature Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Algorithm</Text>
            <Text style={styles.infoValue}>Ed25519</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Key ID</Text>
            <Text style={styles.infoValue}>genesis-owner-2024</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hash</Text>
            <Text style={styles.infoValue}>SHA-256</Text>
          </View>
        </View>

        {/* Sign button */}
        {document && !signed && (
          <TouchableOpacity style={[styles.signButton, signing && styles.signButtonDisabled]} onPress={signDocument} disabled={signing}>
            <LinearGradient colors={[colors.green[500], colors.green[600]]} style={styles.signGradient}>
              <Ionicons name={signing ? 'sync' : 'create'} size={20} color={colors.text.inverse} />
              <Text style={styles.signButtonText}>{signing ? 'SIGNING...' : 'SIGN DOCUMENT'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {signed && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={colors.green[500]} />
            <Text style={styles.successTitle}>Document Signed</Text>
            <Text style={styles.successSubtitle}>Signature added to evidence chain</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  closeButton: { position: 'absolute', right: spacing[4], top: spacing[2], width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.background.glass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...textStyles.h2, color: colors.text.primary },
  headerSubtitle: { ...textStyles.caption, color: colors.text.muted },
  content: { paddingHorizontal: spacing[4] },
  uploadOptions: { flexDirection: 'row', gap: spacing[4], marginBottom: spacing[6] },
  uploadButton: { flex: 1, alignItems: 'center', padding: spacing[6], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.default },
  uploadIcon: { width: 64, height: 64, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  uploadText: { ...textStyles.body, color: colors.text.secondary },
  previewCard: { marginBottom: spacing[6], borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  previewBlur: { padding: spacing[4] },
  previewImage: { width: '100%', height: 200, borderRadius: borderRadius.md, marginBottom: spacing[3] },
  documentPreview: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.card, borderRadius: borderRadius.md, marginBottom: spacing[3] },
  previewInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewName: { ...textStyles.body, color: colors.text.primary, flex: 1 },
  signedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: 'rgba(0,255,0,0.1)', paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.sm },
  signedText: { ...textStyles.caption, color: colors.green[500] },
  signatureInfo: { marginBottom: spacing[6], padding: spacing[4], backgroundColor: colors.background.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.default },
  infoTitle: { ...textStyles.h4, color: colors.text.primary, marginBottom: spacing[3] },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  infoLabel: { ...textStyles.bodySmall, color: colors.text.muted },
  infoValue: { ...textStyles.code, color: colors.cyan[500] },
  signButton: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  signButtonDisabled: { opacity: 0.6 },
  signGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4], gap: spacing[2] },
  signButtonText: { ...textStyles.button, color: colors.text.inverse },
  successCard: { alignItems: 'center', padding: spacing[8], backgroundColor: 'rgba(0,255,0,0.05)', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.green[500] },
  successTitle: { ...textStyles.h3, color: colors.green[500], marginTop: spacing[3] },
  successSubtitle: { ...textStyles.body, color: colors.text.secondary, marginTop: spacing[1] },
});
