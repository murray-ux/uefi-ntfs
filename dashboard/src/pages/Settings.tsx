import { useState } from 'react';
import { Save, Shield, Bell, Eye, Lock } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    autoScan: true,
    scanInterval: 30,
    mfaEnabled: true,
    sessionTimeout: 24,
  });

  const handleSave = () => {
    // Save settings
    alert('Settings saved!');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-orbitron font-bold text-white">Settings</h1>
        <p className="text-cyan-600 font-mono text-sm mt-1">Configure your security preferences</p>
      </div>

      {/* Security Settings */}
      <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
        <h2 className="text-xl font-rajdhani font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="text-cyan-400" size={20} />
          Security
        </h2>

        <div className="space-y-4">
          <ToggleSetting
            label="Multi-Factor Authentication"
            description="Require MFA for all logins"
            checked={settings.mfaEnabled}
            onChange={(checked) => setSettings({ ...settings, mfaEnabled: checked })}
          />

          <div className="flex items-center justify-between py-3">
            <div>
              <label className="text-white font-medium">Session Timeout</label>
              <p className="text-gray-500 text-sm">Auto-logout after inactivity</p>
            </div>
            <select
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
              className="bg-genesis-dark border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value={1}>1 hour</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monitoring Settings */}
      <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
        <h2 className="text-xl font-rajdhani font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="text-cyan-400" size={20} />
          Monitoring
        </h2>

        <div className="space-y-4">
          <ToggleSetting
            label="Automatic Scanning"
            description="Run security scans automatically"
            checked={settings.autoScan}
            onChange={(checked) => setSettings({ ...settings, autoScan: checked })}
          />

          <div className="flex items-center justify-between py-3">
            <div>
              <label className="text-white font-medium">Scan Interval</label>
              <p className="text-gray-500 text-sm">How often to run automatic scans</p>
            </div>
            <select
              value={settings.scanInterval}
              onChange={(e) => setSettings({ ...settings, scanInterval: Number(e.target.value) })}
              className="bg-genesis-dark border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-6">
        <h2 className="text-xl font-rajdhani font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="text-cyan-400" size={20} />
          Notifications
        </h2>

        <div className="space-y-4">
          <ToggleSetting
            label="Push Notifications"
            description="Receive alerts on your devices"
            checked={settings.notifications}
            onChange={(checked) => setSettings({ ...settings, notifications: checked })}
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg font-rajdhani font-semibold hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        Save Settings
      </button>
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <label className="text-white font-medium">{label}</label>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-14 h-7 rounded-full transition-colors relative ${
          checked ? 'bg-cyan-500' : 'bg-gray-600'
        }`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'left-8' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
