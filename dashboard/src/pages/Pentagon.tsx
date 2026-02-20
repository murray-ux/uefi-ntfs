import { useQuery } from '@tanstack/react-query';
import { Shield, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';

export default function Pentagon() {
  const { data, isLoading } = useQuery({
    queryKey: ['pentagon'],
    queryFn: () => api.get('/pentagon/list').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-cyan-400">Loading Pentagon...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-orbitron font-bold text-white">Pentagon Defense</h1>
        <p className="text-cyan-600 font-mono text-sm mt-1">5-Layer Security Architecture</p>
      </div>

      {/* Pentagon Visualization */}
      <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-8">
        <div className="flex justify-center mb-8">
          <div className="relative w-80 h-80">
            {/* Pentagon layers - concentric pentagons */}
            {[5, 4, 3, 2, 1].map((layer, i) => {
              const layerData = data?.layers?.find((l: any) => l.id === layer);
              const size = 60 + (5 - layer) * 40;
              const isSecure = layerData?.status === 'secure';

              return (
                <div
                  key={layer}
                  className={clsx(
                    'absolute rounded-full border-2 transition-all',
                    isSecure ? 'border-cyan-500/50' : 'border-yellow-500/50',
                    isSecure ? 'bg-cyan-500/5' : 'bg-yellow-500/5'
                  )}
                  style={{
                    width: `${size}%`,
                    height: `${size}%`,
                    top: `${(100 - size) / 2}%`,
                    left: `${(100 - size) / 2}%`,
                  }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-genesis-darker px-2">
                    <span className={clsx(
                      'text-xs font-mono',
                      isSecure ? 'text-cyan-400' : 'text-yellow-400'
                    )}>
                      L{layer}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Center icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center">
                <Shield className="text-cyan-400" size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer Details */}
      <div className="space-y-4">
        {data?.layers?.map((layer: any) => (
          <div
            key={layer.id}
            className={clsx(
              'bg-genesis-darker rounded-xl border p-6',
              layer.status === 'secure' ? 'border-cyan-500/30' : 'border-yellow-500/30'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  layer.status === 'secure' ? 'bg-cyan-500/20' : 'bg-yellow-500/20'
                )}>
                  <Lock className={layer.status === 'secure' ? 'text-cyan-400' : 'text-yellow-400'} size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Layer {layer.id}: {layer.name}</h3>
                  <p className="text-gray-500 text-sm">{layer.rooms?.length || 0} security rooms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {layer.status === 'secure' ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <AlertTriangle className="text-yellow-400" size={20} />
                )}
                <span className={layer.status === 'secure' ? 'text-green-400' : 'text-yellow-400'}>
                  {layer.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Room grid */}
            <div className="grid grid-cols-4 gap-2">
              {layer.rooms?.map((room: any) => (
                <div
                  key={room.id}
                  className={clsx(
                    'p-3 rounded-lg border text-center text-xs',
                    room.status === 'secure'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  )}
                >
                  <div className="font-medium truncate">{room.name.split(' - ')[1]}</div>
                  <div className="text-gray-500 mt-1">
                    {room.controlsActive}/{room.controlsTotal}
                  </div>
                </div>
              ))}
            </div>

            {/* Layer stats */}
            <div className="mt-4 pt-4 border-t border-cyan-500/20 flex justify-between text-sm">
              <span className="text-gray-500">
                Controls: {layer.controlsActive}/{layer.controlsTotal}
              </span>
              <span className="text-gray-500">
                Avg Threat Level: {layer.avgThreatLevel}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
