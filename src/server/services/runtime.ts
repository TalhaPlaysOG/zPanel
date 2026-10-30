import {
  createServerContainer,
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  getContainerStatus,
  getContainerStats,
  getContainerLogs,
  attachContainerSocket,
  sendContainerCommand,
  isDockerAvailableForNode,
} from "./docker.js";

import {
  createLocalServer,
  startLocalServer,
  stopLocalServer,
  restartLocalServer,
  deleteLocalServer,
  getLocalServerStatus,
  getLocalServerStats,
  getLocalServerLogs,
  attachLocalServerSocket,
  sendLocalServerCommand,
} from "./local.js";

/**
 * Decide how a server should actually run.
 *
 * A server configured for Docker must never be simulated when Docker is not
 * available. In that case the real local process runtime is used instead, so
 * the panel still talks to an actual Minecraft process.
 */
export const resolveRuntimeType = async (serverData: any): Promise<"local" | "docker"> => {
  if (serverData?.runtimeType === "local") return "local";

  const nodeId = serverData?.nodeId || "local";
  if (nodeId !== "local") return "docker"; // remote nodes always use their Docker API

  const dockerAvailable = await isDockerAvailableForNode(nodeId);
  return dockerAvailable ? "docker" : "local";
};

export const getEffectiveRuntimeType = resolveRuntimeType;

export const createServerRuntime = async (serverData: any, nodeId?: string) => {
  const effective = await resolveRuntimeType({ ...serverData, nodeId: nodeId || serverData.nodeId });
  if (effective === "local") {
    return await createLocalServer(serverData);
  }
  return await createServerContainer(serverData, nodeId);
};

export const startServerRuntime = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await startLocalServer(server.id, server);
  }
  return await startContainer(server.containerId, server.nodeId);
};

export const stopServerRuntime = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await stopLocalServer(server.id);
  }
  return await stopContainer(server.containerId, server.nodeId);
};

export const restartServerRuntime = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await restartLocalServer(server.id, server);
  }
  return await restartContainer(server.containerId, server.nodeId);
};

export const deleteServerRuntime = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await deleteLocalServer(server.id);
  }
  return await deleteContainer(server.containerId, server.nodeId);
};

export const getServerRuntimeStatus = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await getLocalServerStatus(server.id);
  }
  return await getContainerStatus(server.containerId, server.nodeId);
};

export const getServerRuntimeStats = async (server: any) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await getLocalServerStats(server.id);
  }
  return await getContainerStats(server.containerId, server.nodeId);
};

export const getServerRuntimeLogs = async (server: any, lines = 200) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await getLocalServerLogs(server.id, lines);
  }
  return await getContainerLogs(server.containerId, server.nodeId);
};

export const attachServerRuntimeSocket = async (server: any, serverId: string) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return attachLocalServerSocket(server.id, serverId);
  }
  return await attachContainerSocket(server.containerId, serverId, server.nodeId);
};

export const sendServerRuntimeCommand = async (server: any, command: string) => {
  const effective = await resolveRuntimeType(server);
  if (effective === "local") {
    return await sendLocalServerCommand(server.id, command);
  }
  return await sendContainerCommand(server.containerId, command, server.nodeId);
};
