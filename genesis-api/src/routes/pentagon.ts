import { Router, Response } from 'express';
import { getDb } from '../services/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const pentagonRoutes = Router();

// Get all pentagon rooms
pentagonRoutes.get('/list', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const rooms = db.prepare(`
    SELECT id, layer, name, status, threat_level as threatLevel,
           controls_active as controlsActive, controls_total as controlsTotal,
           last_scan as lastScan
    FROM pentagon_rooms
    ORDER BY layer, name
  `).all();

  // Group by layer
  const layers = [
    { id: 1, name: 'Perimeter', rooms: [] as any[] },
    { id: 2, name: 'Network', rooms: [] as any[] },
    { id: 3, name: 'Endpoint', rooms: [] as any[] },
    { id: 4, name: 'Application', rooms: [] as any[] },
    { id: 5, name: 'Data', rooms: [] as any[] },
  ];

  for (const room of rooms as any[]) {
    const layer = layers.find(l => l.id === room.layer);
    if (layer) {
      layer.rooms.push(room);
    }
  }

  // Calculate layer stats
  const layersWithStats = layers.map(layer => ({
    ...layer,
    status: layer.rooms.every((r: any) => r.status === 'secure') ? 'secure' : 'warning',
    avgThreatLevel: layer.rooms.length > 0
      ? Math.round(layer.rooms.reduce((sum: number, r: any) => sum + r.threatLevel, 0) / layer.rooms.length)
      : 0,
    controlsActive: layer.rooms.reduce((sum: number, r: any) => sum + r.controlsActive, 0),
    controlsTotal: layer.rooms.reduce((sum: number, r: any) => sum + r.controlsTotal, 0),
  }));

  res.json({ layers: layersWithStats });
});

// Get room details
pentagonRoutes.get('/room/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const room = db.prepare('SELECT * FROM pentagon_rooms WHERE id = ?').get(req.params.id) as any;

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  // Generate mock controls for the room
  const controls = [];
  const controlTypes = ['Firewall Rule', 'IDS Signature', 'Access Policy', 'Encryption', 'Monitoring', 'Backup'];

  for (let i = 0; i < room.controls_total; i++) {
    controls.push({
      id: `ctrl-${room.id}-${i}`,
      name: `${controlTypes[i % controlTypes.length]} ${i + 1}`,
      status: i < room.controls_active ? 'active' : 'inactive',
      lastChecked: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    });
  }

  res.json({
    room: {
      id: room.id,
      layer: room.layer,
      name: room.name,
      status: room.status,
      threatLevel: room.threat_level,
      controlsActive: room.controls_active,
      controlsTotal: room.controls_total,
      lastScan: room.last_scan,
    },
    controls,
    threats: room.threat_level > 0 ? [
      { type: 'Anomaly', description: 'Unusual traffic pattern detected', severity: 'medium' },
    ] : [],
  });
});

// Get layer details
pentagonRoutes.get('/layer/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const layerId = parseInt(req.params.id);

  const rooms = db.prepare(`
    SELECT id, layer, name, status, threat_level as threatLevel,
           controls_active as controlsActive, controls_total as controlsTotal,
           last_scan as lastScan
    FROM pentagon_rooms
    WHERE layer = ?
    ORDER BY name
  `).all(layerId) as any[];

  if (rooms.length === 0) {
    res.status(404).json({ error: 'Layer not found' });
    return;
  }

  const layerNames = ['', 'Perimeter', 'Network', 'Endpoint', 'Application', 'Data'];

  res.json({
    layer: {
      id: layerId,
      name: layerNames[layerId],
      status: rooms.every(r => r.status === 'secure') ? 'secure' : 'warning',
      avgThreatLevel: Math.round(rooms.reduce((sum, r) => sum + r.threatLevel, 0) / rooms.length),
      controlsActive: rooms.reduce((sum, r) => sum + r.controlsActive, 0),
      controlsTotal: rooms.reduce((sum, r) => sum + r.controlsTotal, 0),
    },
    rooms,
  });
});

// Run pentagon scan
pentagonRoutes.post('/scan', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDb();

  // Update last_scan for all rooms
  db.prepare('UPDATE pentagon_rooms SET last_scan = datetime("now")').run();

  res.json({
    scanId: `pentagon-scan-${Date.now()}`,
    status: 'initiated',
    layers: 5,
    rooms: 40,
    estimatedTime: 60,
    message: 'Pentagon security scan initiated',
  });
});

// Update room status
pentagonRoutes.patch('/room/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { status, threatLevel } = req.body;
  const db = getDb();

  const room = db.prepare('SELECT * FROM pentagon_rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (status !== undefined) {
    db.prepare('UPDATE pentagon_rooms SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  if (threatLevel !== undefined) {
    db.prepare('UPDATE pentagon_rooms SET threat_level = ? WHERE id = ?').run(threatLevel, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM pentagon_rooms WHERE id = ?').get(req.params.id);
  res.json({ room: updated });
});
