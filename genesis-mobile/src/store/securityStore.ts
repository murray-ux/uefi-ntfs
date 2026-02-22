/**
 * GENESIS 2.0 - Security Store
 * Manages security state, device health, and threat monitoring
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
export type ThreatLevel = 'secure' | 'low' | 'medium' | 'high' | 'critical';
export type DeviceStatus = 'healthy' | 'warning' | 'compromised' | 'unknown' | 'offline';

export interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  maxValue: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: number;
}

export interface ThreatAlert {
  id: string;
  type: 'intrusion' | 'malware' | 'anomaly' | 'policy_violation' | 'auth_failure' | 'network' | 'system';
  severity: ThreatLevel;
  title: string;
  description: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  actions?: string[];
}

export interface DeviceHealth {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'mobile' | 'server' | 'iot';
  status: DeviceStatus;
  os: string;
  lastSeen: number;
  ipAddress: string;
  macAddress: string;
  cisScore: number;
  vulnerabilities: number;
  patches: {
    pending: number;
    installed: number;
    failed: number;
  };
  certificates: {
    valid: number;
    expiring: number;
    expired: number;
  };
}

export interface NetworkStats {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  activeConnections: number;
  blockedConnections: number;
  lastUpdated: number;
}

export interface PentagonRoom {
  id: string;
  name: string;
  layer: 'kernel' | 'conduit' | 'reservoir' | 'valve' | 'manifold';
  status: 'active' | 'idle' | 'error' | 'maintenance';
  metrics: {
    load: number;
    memory: number;
    requests: number;
    errors: number;
  };
  lastActivity: number;
}

export interface SecurityState {
  // Overall status
  overallThreatLevel: ThreatLevel;
  lastScanTime: number;
  isScanning: boolean;

  // Metrics
  metrics: SecurityMetric[];

  // Alerts
  alerts: ThreatAlert[];
  unacknowledgedCount: number;

  // Devices
  devices: DeviceHealth[];
  selectedDeviceId: string | null;

  // Network
  networkStats: NetworkStats;

  // Pentagon
  pentagonRooms: PentagonRoom[];
  selectedRoomId: string | null;

  // Audit
  auditEntries: AuditEntry[];
  ledgerValid: boolean;

  // Actions
  setThreatLevel: (level: ThreatLevel) => void;
  setScanning: (scanning: boolean) => void;

  // Alert actions
  addAlert: (alert: Omit<ThreatAlert, 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  clearResolvedAlerts: () => void;

  // Device actions
  setDevices: (devices: DeviceHealth[]) => void;
  selectDevice: (id: string | null) => void;
  updateDevice: (id: string, updates: Partial<DeviceHealth>) => void;

  // Network actions
  updateNetworkStats: (stats: Partial<NetworkStats>) => void;

  // Pentagon actions
  setPentagonRooms: (rooms: PentagonRoom[]) => void;
  selectRoom: (id: string | null) => void;
  updateRoom: (id: string, updates: Partial<PentagonRoom>) => void;

  // Audit actions
  setAuditEntries: (entries: AuditEntry[]) => void;
  verifyLedger: () => Promise<boolean>;

  // Fetch actions
  fetchSecurityOverview: () => Promise<void>;
  fetchDevices: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchPentagonStatus: () => Promise<void>;
  runSecurityScan: () => Promise<void>;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  actor: string;
  timestamp: number;
  success: boolean;
  metadata: Record<string, unknown>;
  hash: string;
  prevHash: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export const useSecurityStore = create<SecurityState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    overallThreatLevel: 'secure',
    lastScanTime: 0,
    isScanning: false,
    metrics: [],
    alerts: [],
    unacknowledgedCount: 0,
    devices: [],
    selectedDeviceId: null,
    networkStats: {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      activeConnections: 0,
      blockedConnections: 0,
      lastUpdated: 0,
    },
    pentagonRooms: [],
    selectedRoomId: null,
    auditEntries: [],
    ledgerValid: true,

    // Setters
    setThreatLevel: (level) => set({ overallThreatLevel: level }),
    setScanning: (scanning) => set({ isScanning: scanning }),

    // Alert actions
    addAlert: (alert) => {
      const newAlert: ThreatAlert = {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
      };
      set((state) => ({
        alerts: [newAlert, ...state.alerts],
        unacknowledgedCount: state.unacknowledgedCount + 1,
      }));
    },

    acknowledgeAlert: (id) => {
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a
        ),
        unacknowledgedCount: Math.max(0, state.unacknowledgedCount - 1),
      }));
    },

    resolveAlert: (id) => {
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, resolved: true, acknowledged: true } : a
        ),
      }));
    },

    clearResolvedAlerts: () => {
      set((state) => ({
        alerts: state.alerts.filter((a) => !a.resolved),
      }));
    },

    // Device actions
    setDevices: (devices) => set({ devices }),
    selectDevice: (id) => set({ selectedDeviceId: id }),
    updateDevice: (id, updates) => {
      set((state) => ({
        devices: state.devices.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      }));
    },

    // Network actions
    updateNetworkStats: (stats) => {
      set((state) => ({
        networkStats: { ...state.networkStats, ...stats, lastUpdated: Date.now() },
      }));
    },

    // Pentagon actions
    setPentagonRooms: (rooms) => set({ pentagonRooms: rooms }),
    selectRoom: (id) => set({ selectedRoomId: id }),
    updateRoom: (id, updates) => {
      set((state) => ({
        pentagonRooms: state.pentagonRooms.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
    },

    // Audit actions
    setAuditEntries: (entries) => set({ auditEntries: entries }),

    verifyLedger: async () => {
      try {
        const response = await fetch(`${API_BASE}/audit/chain`);
        const data = await response.json();
        set({ ledgerValid: data.valid });
        return data.valid;
      } catch {
        set({ ledgerValid: false });
        return false;
      }
    },

    // Fetch actions
    fetchSecurityOverview: async () => {
      try {
        const response = await fetch(`${API_BASE}/shield/health`);
        const data = await response.json();

        set({
          overallThreatLevel: data.threatLevel || 'secure',
          lastScanTime: data.lastScan || Date.now(),
          metrics: data.metrics || [],
        });
      } catch {
        // Handle error
      }
    },

    fetchDevices: async () => {
      try {
        const response = await fetch(`${API_BASE}/network/devices`);
        const data = await response.json();
        set({ devices: data.devices || [] });
      } catch {
        // Handle error
      }
    },

    fetchAlerts: async () => {
      try {
        const response = await fetch(`${API_BASE}/alerts`);
        const data = await response.json();
        const alerts = data.alerts || [];
        set({
          alerts,
          unacknowledgedCount: alerts.filter((a: ThreatAlert) => !a.acknowledged).length,
        });
      } catch {
        // Handle error
      }
    },

    fetchPentagonStatus: async () => {
      try {
        const response = await fetch(`${API_BASE}/pentagon/list`);
        const data = await response.json();
        set({ pentagonRooms: data.rooms || [] });
      } catch {
        // Handle error
      }
    },

    runSecurityScan: async () => {
      set({ isScanning: true });
      try {
        const response = await fetch(`${API_BASE}/shield/scan`, { method: 'POST' });
        const data = await response.json();

        set({
          isScanning: false,
          lastScanTime: Date.now(),
          overallThreatLevel: data.threatLevel || 'secure',
          metrics: data.metrics || [],
        });

        // Add any new alerts from scan
        if (data.alerts) {
          data.alerts.forEach((alert: Omit<ThreatAlert, 'id' | 'timestamp'>) => {
            get().addAlert(alert);
          });
        }
      } catch {
        set({ isScanning: false });
      }
    },
  }))
);

// Selector hooks
export const useAlerts = () => useSecurityStore((state) => state.alerts);
export const useDevices = () => useSecurityStore((state) => state.devices);
export const usePentagonRooms = () => useSecurityStore((state) => state.pentagonRooms);
export const useThreatLevel = () => useSecurityStore((state) => state.overallThreatLevel);
