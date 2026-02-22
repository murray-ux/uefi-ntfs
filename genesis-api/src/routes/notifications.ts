import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';

export const notificationRoutes = Router();

// Register installation (Batch-style)
notificationRoutes.post('/installations', (req: Request, res: Response) => {
  const {
    installationId,
    pushToken,
    platform,
    deviceModel,
    osVersion,
    appVersion,
    timezone,
    locale,
    userId,
    segments,
    customAttributes,
  } = req.body;

  if (!installationId || !platform) {
    res.status(400).json({ error: 'installationId and platform required' });
    return;
  }

  const db = getDb();
  const id = uuidv4();

  // Upsert installation
  const existing = db.prepare('SELECT id FROM notification_installations WHERE installation_id = ?').get(installationId);

  if (existing) {
    db.prepare(`
      UPDATE notification_installations SET
        push_token = ?, platform = ?, device_model = ?, os_version = ?, app_version = ?,
        timezone = ?, locale = ?, user_id = ?, segments = ?, custom_attributes = ?,
        updated_at = datetime('now')
      WHERE installation_id = ?
    `).run(
      pushToken, platform, deviceModel, osVersion, appVersion,
      timezone, locale, userId, JSON.stringify(segments || []), JSON.stringify(customAttributes || {}),
      installationId
    );
  } else {
    db.prepare(`
      INSERT INTO notification_installations
        (id, installation_id, push_token, platform, device_model, os_version, app_version,
         timezone, locale, user_id, segments, custom_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, installationId, pushToken, platform, deviceModel, osVersion, appVersion,
      timezone, locale, userId, JSON.stringify(segments || []), JSON.stringify(customAttributes || {})
    );
  }

  res.json({ success: true, installationId });
});

// Update installation attributes
notificationRoutes.put('/installations/:installationId/attributes', (req: Request, res: Response) => {
  const { installationId } = req.params;
  const attributes = req.body;

  const db = getDb();
  db.prepare(`
    UPDATE notification_installations SET custom_attributes = ?, updated_at = datetime('now')
    WHERE installation_id = ?
  `).run(JSON.stringify(attributes), installationId);

  res.json({ success: true });
});

// Update installation preferences
notificationRoutes.put('/installations/:installationId/preferences', (req: Request, res: Response) => {
  const { installationId } = req.params;
  const preferences = req.body;

  const db = getDb();
  db.prepare(`
    UPDATE notification_installations SET preferences = ?, updated_at = datetime('now')
    WHERE installation_id = ?
  `).run(JSON.stringify(preferences), installationId);

  res.json({ success: true });
});

// Track analytics event
notificationRoutes.post('/analytics', (req: Request, res: Response) => {
  const { type, notificationId, installationId, actionId, category } = req.body;

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO notification_analytics (id, notification_id, installation_id, event_type, action_id, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, notificationId, installationId, type, actionId, category);

  res.json({ success: true });
});

// Get analytics summary
notificationRoutes.get('/analytics/summary', (req: Request, res: Response) => {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      event_type,
      COUNT(*) as count
    FROM notification_analytics
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY event_type
  `).all();

  const byCategory = db.prepare(`
    SELECT
      category,
      COUNT(*) as count
    FROM notification_analytics
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY category
  `).all();

  res.json({ stats, byCategory });
});

// Legacy register endpoint
notificationRoutes.post('/register', (req: Request, res: Response) => {
  const { token, platform, deviceId } = req.body;

  // Redirect to new installation endpoint
  const db = getDb();
  const id = uuidv4();
  const installationId = `legacy-${deviceId || id}`;

  db.prepare(`
    INSERT OR REPLACE INTO notification_installations
      (id, installation_id, push_token, platform, device_model)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, installationId, token, platform, deviceId);

  res.json({ success: true });
});
