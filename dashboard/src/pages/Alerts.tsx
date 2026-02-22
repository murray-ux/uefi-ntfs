import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export default function Alerts() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then(res => res.data),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/alerts/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/alerts/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading alerts...</div>
      </div>
    );
  }

  const severityConfig: Record<string, { color: string; bg: string }> = {
    critical: { color: 'text-red-500', bg: 'bg-red-500/20 border-red-500/50' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/50' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/50' },
    low: { color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/50' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-white">Alerts</h1>
          <p className="text-cyan-600 font-mono text-sm mt-1">Security events and notifications</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
            {data?.alerts?.filter((a: any) => a.severity === 'critical' && !a.resolved).length || 0} Critical
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm">
            {data?.alerts?.filter((a: any) => a.severity === 'high' && !a.resolved).length || 0} High
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {data?.alerts?.map((alert: any) => {
          const severity = severityConfig[alert.severity] || severityConfig.low;

          return (
            <div
              key={alert.id}
              className={clsx(
                'bg-genesis-darker rounded-xl border p-6 transition-opacity',
                severity.bg,
                alert.resolved && 'opacity-50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={clsx('mt-1', severity.color)}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{alert.title}</h3>
                    <p className="text-gray-400 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className={clsx('uppercase font-semibold', severity.color)}>
                        {alert.severity}
                      </span>
                      <span className="text-gray-500">
                        {alert.category}
                      </span>
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock size={14} />
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {!alert.resolved && (
                  <div className="flex gap-2">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => resolveMutation.mutate(alert.id)}
                      className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle size={14} />
                      Resolve
                    </button>
                  </div>
                )}

                {alert.resolved && (
                  <span className="text-green-400 flex items-center gap-1 text-sm">
                    <CheckCircle size={16} />
                    Resolved
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {(!data?.alerts || data.alerts.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No alerts to display
          </div>
        )}
      </div>
    </div>
  );
}
