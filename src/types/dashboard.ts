export type ServerStatus = "online" | "offline" | "starting" | "stopping" | "downloading" | "error" | (string & {});

export interface ServerSummary {
  id: string;
  name: string;
  status: ServerStatus;
  createdAt: string;
  software?: string;
  version?: string;
  port?: number;
  ipAlias?: string;
  suspended?: boolean;
  owner?: string;
  /** RAM allocated in GB */
  ram?: number;
  /** RAM limit in MB (alias used in some views) */
  memory?: number;
  cpu?: number;
  disk?: number;
  /** Server software type (paper, spigot, forge, etc.) */
  type?: string;
  nodeId?: string;
  runtimeType?: string;
  containerId?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  lastError?: string | null;
}

export interface SystemStats {
  cpuUsage: number;
  ramUsage: number;
  /** Total system RAM in bytes */
  totalMemory?: number;
  /** Free system RAM in bytes */
  freeMemory?: number;
  diskUsage?: number;
  activeContainers?: number;
  totalContainers?: number;
  uptime?: string;
}
