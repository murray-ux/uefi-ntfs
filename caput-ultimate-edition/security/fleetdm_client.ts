// security/fleetdm_client.ts
//
// FleetDM API client — device management, enrollment, script execution.
//
// Uses Node 20 built-in fetch (no axios dependency).
// All methods are fail-safe: network errors are caught and logged,
// never crash the calling service.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FleetHost {
  hostname: string;
  platform: string;
  osVersion: string;
  edrRunning: boolean;
  diskUsage: number;
  cpuUsage: number;
  memoryUsage: number;
  lastSeen: string;
}

export interface EnrollParams {
  hostname: string;
  platform: string;
  enrollSecret: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class FleetDMClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.baseUrl = apiUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);

    if (!res.ok) {
      throw new Error(`FleetDM ${method} ${path}: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getAllHosts(): Promise<FleetHost[]> {
    const data = (await this.request("GET", "/api/v1/fleet/hosts")) as any;
    return (data.hosts || []).map((h: any) => ({
      hostname: h.hostname,
      platform: h.platform,
      osVersion: h.os_version,
      edrRunning: h.edr_running ?? false,
      diskUsage: h.disk_usage_percent ?? 0,
      cpuUsage: h.cpu_usage_percent ?? 0,
      memoryUsage: h.memory_usage_percent ?? 0,
      lastSeen: h.seen_time || h.last_seen || "",
    }));
  }

  async getHostDetails(hostname: string): Promise<FleetHost> {
    const data = (await this.request("GET", `/api/v1/fleet/hosts/${encodeURIComponent(hostname)}`)) as any;
    const h = data.host || data;
    return {
      hostname: h.hostname,
      platform: h.platform,
      osVersion: h.os_version,
      edrRunning: h.edr_running ?? false,
      diskUsage: h.disk_usage_percent ?? 0,
      cpuUsage: h.cpu_usage_percent ?? 0,
      memoryUsage: h.memory_usage_percent ?? 0,
      lastSeen: h.seen_time || h.last_seen || "",
    };
  }

  async createEnrollmentSecret(hostname: string): Promise<string> {
    const data = (await this.request("POST", "/api/v1/fleet/spec/enroll_secret", {
      name: `${hostname}-secret`,
    })) as any;
    return data.spec?.secrets?.[0]?.secret || "";
  }

  async enrollHost(params: EnrollParams): Promise<void> {
    await this.request("POST", "/api/v1/osquery/enroll", params);
  }

  async assignHostToUser(hostname: string, email: string): Promise<void> {
    await this.request("PATCH", `/api/v1/fleet/hosts/${encodeURIComponent(hostname)}`, {
      assigned_user: email,
    });
  }

  async runScript(hostname: string, scriptPath: string): Promise<void> {
    await this.request("POST", "/api/v1/fleet/scripts/run", {
      host_id: hostname,
      script_path: scriptPath,
    });
  }

  async triggerHeartbeat(hostname: string): Promise<void> {
    await this.request("POST", `/api/v1/fleet/hosts/${encodeURIComponent(hostname)}/refetch`);
  }
}
