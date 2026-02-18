/**
 * GENESIS 2.0 - Pentagon Screen
 * 40-room Pentagon visualization
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { colors, textStyles, spacing, borderRadius, pentagonColors } from '../theme';
import { useSecurityStore, PentagonRoom } from '../store/securityStore';

const { width } = Dimensions.get('window');
const PENTAGON_SIZE = width - spacing[8];

const layers = [
  { id: 'kernel', name: 'L0 Kernel', color: pentagonColors.kernel, rooms: 7 },
  { id: 'conduit', name: 'L1 Conduit', color: pentagonColors.conduit, rooms: 7 },
  { id: 'reservoir', name: 'L2 Reservoir', color: pentagonColors.reservoir, rooms: 8 },
  { id: 'valve', name: 'L3 Valve', color: pentagonColors.valve, rooms: 9 },
  { id: 'manifold', name: 'L4 Manifold', color: pentagonColors.manifold, rooms: 9 },
];

function RoomCard({ room }: { room: PentagonRoom }) {
  const layer = layers.find((l) => l.id === room.layer);

  return (
    <TouchableOpacity style={styles.roomCard}>
      <BlurView intensity={20} tint="dark" style={styles.roomBlur}>
        <View style={[styles.roomStatus, { backgroundColor: `${layer?.color}20` }]}>
          <View
            style={[
              styles.roomStatusDot,
              {
                backgroundColor:
                  room.status === 'active'
                    ? colors.green[500]
                    : room.status === 'error'
                    ? colors.red[500]
                    : colors.text.muted,
              },
            ]}
          />
        </View>
        <Text style={styles.roomName}>{room.name}</Text>
        <Text style={[styles.roomLayer, { color: layer?.color }]}>{layer?.name}</Text>
        <View style={styles.roomMetrics}>
          <Text style={styles.roomMetricText}>Load: {room.metrics.load}%</Text>
          <Text style={styles.roomMetricText}>Req: {room.metrics.requests}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

export default function PentagonScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pentagonRooms } = useSecurityStore();
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const filteredRooms = selectedLayer
    ? pentagonRooms.filter((r) => r.layer === selectedLayer)
    : pentagonRooms;

  // Mock rooms if empty
  const displayRooms =
    filteredRooms.length > 0
      ? filteredRooms
      : layers.flatMap((layer) =>
          Array.from({ length: layer.rooms }, (_, i) => ({
            id: `${layer.id}-${i}`,
            name: `${layer.name} Room ${i + 1}`,
            layer: layer.id as any,
            status: Math.random() > 0.2 ? 'active' : 'idle',
            metrics: {
              load: Math.floor(Math.random() * 100),
              memory: Math.floor(Math.random() * 100),
              requests: Math.floor(Math.random() * 1000),
              errors: Math.floor(Math.random() * 10),
            },
            lastActivity: Date.now(),
          }))
        );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pentagon</Text>
        <Text style={styles.headerSubtitle}>40 Rooms | 5 Layers</Text>
      </View>

      {/* Pentagon Visualization */}
      <View style={styles.pentagonContainer}>
        <Svg width={PENTAGON_SIZE} height={PENTAGON_SIZE} viewBox="0 0 200 200">
          {layers.map((layer, index) => {
            const size = 80 - index * 14;
            const points = Array.from({ length: 5 }, (_, i) => {
              const angle = (i * 72 - 90) * (Math.PI / 180);
              const x = 100 + size * Math.cos(angle);
              const y = 100 + size * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');

            return (
              <G key={layer.id}>
                <Path
                  d={`M ${points.split(' ')[0]} L ${points.split(' ').slice(1).join(' L ')} Z`}
                  fill={`${layer.color}20`}
                  stroke={layer.color}
                  strokeWidth={selectedLayer === layer.id ? 2 : 1}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLayer(selectedLayer === layer.id ? null : layer.id);
                  }}
                />
              </G>
            );
          })}
          <Circle cx="100" cy="100" r="10" fill={colors.cyan[500]} />
        </Svg>
      </View>

      {/* Layer filters */}
      <View style={styles.layerFilters}>
        {layers.map((layer) => (
          <TouchableOpacity
            key={layer.id}
            style={[
              styles.layerChip,
              selectedLayer === layer.id && { backgroundColor: `${layer.color}30` },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedLayer(selectedLayer === layer.id ? null : layer.id);
            }}
          >
            <View style={[styles.layerDot, { backgroundColor: layer.color }]} />
            <Text style={[styles.layerName, { color: layer.color }]}>{layer.name}</Text>
            <Text style={styles.layerCount}>{layer.rooms}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rooms list */}
      <ScrollView
        contentContainerStyle={[styles.roomsList, { paddingBottom: insets.bottom + spacing[4] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomsGrid}>
          {displayRooms.map((room: any) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  closeButton: {
    position: 'absolute',
    right: spacing[4],
    top: spacing[2],
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textStyles.displaySmall,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  pentagonContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  layerFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.glass,
    gap: spacing[1],
  },
  layerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  layerName: {
    ...textStyles.caption,
    fontSize: 10,
  },
  layerCount: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
  roomsList: {
    paddingHorizontal: spacing[4],
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  roomCard: {
    width: (width - spacing[8] - spacing[4]) / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  roomBlur: {
    padding: spacing[2],
    alignItems: 'center',
  },
  roomStatus: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  roomStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomName: {
    ...textStyles.caption,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 9,
  },
  roomLayer: {
    ...textStyles.caption,
    fontSize: 8,
  },
  roomMetrics: {
    marginTop: spacing[1],
  },
  roomMetricText: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontSize: 8,
  },
});
