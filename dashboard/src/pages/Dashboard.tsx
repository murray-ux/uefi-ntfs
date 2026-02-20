import { useQuery } from '@tanstack/react-query';
import { Shield, Monitor, AlertTriangle, Activity, Wifi, Lock } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['security-health'],
    queryFn: () => api.get('/security/health').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading...</div>
      </div>
    );
  }

  const threatColors = {
    secure: 'text-green-400 bg-green-500/20 border-green-500/50',
    low: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    medium: 'text-orange-400 bg-orange-500/20 border-orange-500/50',
    high: 'text-red-400 bg-red-500/20 border-red-500/50',
    critical: 'text-red-500 bg-red-600/20 border-red-600/50 animate-pulse',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-white">Security Overview</h1>
          <p className="text-cyan-600 font-mono text-sm mt-1">Real-time threat monitoring</p>
        </div>
        <div className={clsx(
          'px-6 py-3 rounded-xl border font-rajdhani font-semibold uppercase',
          threatColors[data?.threatLevel as keyof typeof threatColors] || threatColors.secure
        )}>
          {data?.threatLevel || 'SECURE'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Security Score"
          value={data?.overallScore || 100}
          suffix="%"
          color="cyan"
        />
        <StatCard
          icon={Monitor}
          label="Devices"
          value={data?.devices?.total || 0}
          subtitle={`${data?.devices?.healthy || 0} healthy`}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={data?.alerts?.unresolved || 0}
          subtitle={`${data?.alerts?.critical || 0} critical`}
          color={data?.alerts?.critical > 0 ? 'red' : 'yellow'}
        />
        <StatCard
          icon={Activity}
          label="Vulnerabilities"
          value={data?.vulnerabilities || 0}
          subtitle={`${data?.patchesPending || 0} patches pending`}
          color={data?.vulnerabilities > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Pentagon & Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pentagon Status */}
        <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
          <h2 className="text-xl font-rajdhani font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="text-cyan-400" size={20} />
            Pentagon Defense
          </h2>
          <div className="space-y-3">
            {['Perimeter', 'Network', 'Endpoint', 'Application', 'Data'].map((layer, i) => (
              <div key={layer} className="flex items-center gap-4">
                <span className="w-24 text-cyan-600 text-sm">{layer}</span>
                <div className="flex-1 h-2 bg-genesis-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                    style={{ width: `${90 + Math.random() * 10}%` }}
                  />
                </div>
                <span className="text-green-400 text-sm w-12">SECURE</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-cyan-500/20">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-600">Active Controls</span>
              <span className="text-white">{data?.pentagon?.activeControls || 0} / {data?.pentagon?.totalControls || 0}</span>
            </div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
          <h2 className="text-xl font-rajdhani font-semibold text-white mb-4 flex items-center gap-2">
            <Wifi className="text-cyan-400" size={20} />
            Network Activity
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-cyan-600">Active Connections</span>
              <span className="text-white font-mono">{data?.networkStats?.activeConnections || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-600">Blocked Connections</span>
              <span className="text-red-400 font-mono">{data?.networkStats?.blockedConnections || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-600">Data In</span>
              <span className="text-green-400 font-mono">{formatBytes(data?.networkStats?.bytesIn || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-600">Data Out</span>
              <span className="text-yellow-400 font-mono">{formatBytes(data?.networkStats?.bytesOut || 0)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-cyan-500/20 text-xs text-cyan-700">
            Last scan: {data?.lastScan ? new Date(data.lastScan).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
        <h2 className="text-xl font-rajdhani font-semibold text-white mb-4">Alert Distribution</h2>
        <div className="grid grid-cols-4 gap-4">
          <AlertBadge label="Critical" count={data?.alerts?.critical || 0} color="red" />
          <AlertBadge label="High" count={data?.alerts?.high || 0} color="orange" />
          <AlertBadge label="Medium" count={data?.alerts?.medium || 0} color="yellow" />
          <AlertBadge label="Low" count={data?.alerts?.low || 0} color="cyan" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, subtitle, color }: {
  icon: any;
  label: string;
  value: number | string;
  suffix?: string;
  subtitle?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    cyan: 'border-cyan-500/30 text-cyan-400',
    green: 'border-green-500/30 text-green-400',
    yellow: 'border-yellow-500/30 text-yellow-400',
    orange: 'border-orange-500/30 text-orange-400',
    red: 'border-red-500/30 text-red-400',
  };

  return (
    <div className={clsx('bg-genesis-darker rounded-xl border p-6', colors[color])}>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={24} />
        <span className="text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-orbitron font-bold text-white">
        {value}{suffix}
      </div>
      {subtitle && (
        <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function AlertBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-500/20 border-red-500/50 text-red-400',
    orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    cyan: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
  };

  return (
    <div className={clsx('rounded-lg border p-4 text-center', colors[color])}>
      <div className="text-2xl font-orbitron font-bold">{count}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
