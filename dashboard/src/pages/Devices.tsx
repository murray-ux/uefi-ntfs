import { useQuery } from '@tanstack/react-query';
import { Monitor, Server, Smartphone, Wifi, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';

export default function Devices() {
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading devices...</div>
      </div>
    );
  }

  const deviceIcons: Record<string, any> = {
    desktop: Monitor,
    server: Server,
    mobile: Smartphone,
    network: Wifi,
  };

  const statusConfig: Record<string, { icon: any; color: string }> = {
    healthy: { icon: CheckCircle, color: 'text-green-400' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400' },
    critical: { icon: XCircle, color: 'text-red-400' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-orbitron font-bold text-white">Devices</h1>
        <p className="text-cyan-600 font-mono text-sm mt-1">Managed endpoints and infrastructure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.devices?.map((device: any) => {
          const DeviceIcon = deviceIcons[device.type] || Monitor;
          const status = statusConfig[device.status] || statusConfig.healthy;
          const StatusIcon = status.icon;

          return (
            <div
              key={device.id}
              className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6 hover:border-cyan-400/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <DeviceIcon className="text-cyan-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{device.name}</h3>
                    <p className="text-cyan-600 text-sm">{device.type}</p>
                  </div>
                </div>
                <StatusIcon className={status.color} size={20} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">IP Address</span>
                  <span className="text-white font-mono">{device.ip_address || device.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">OS</span>
                  <span className="text-white">{device.os}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CIS Score</span>
                  <span className={clsx(
                    'font-bold',
                    device.cis_score >= 90 ? 'text-green-400' :
                    device.cis_score >= 70 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {device.cis_score || device.cisScore}%
                  </span>
                </div>
              </div>

              {(device.vulnerabilities > 0 || device.patches_pending > 0) && (
                <div className="mt-4 pt-4 border-t border-cyan-500/20 flex gap-4 text-xs">
                  {device.vulnerabilities > 0 && (
                    <span className="text-red-400">
                      {device.vulnerabilities} vulnerabilities
                    </span>
                  )}
                  {device.patches_pending > 0 && (
                    <span className="text-yellow-400">
                      {device.patches_pending} patches pending
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
