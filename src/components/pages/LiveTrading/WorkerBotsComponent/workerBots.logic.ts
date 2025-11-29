// src/components/pages/LiveTrading/WorkerBotsComponent/workerBots.logic.ts

import {
  liveTrading,
  type WorkerSummaryDto,
  type WorkerMode,
  type ResetWorkerDailyRequest,
} from "@/controllers/liveTrading";

export type { WorkerSummaryDto, WorkerMode, ResetWorkerDailyRequest };

export interface UpdateWorkerModeRequest {
  mode: WorkerMode | string;
}

export interface UpdateWorkerActiveRequest {
  isActive: boolean;
}

export interface AllocateWorkerDailyRequest {
  dailyCapital: number;
}

/**
 * Fetch all workers and only keep those with isActive = 1.
 * isActive = 0 means fully disabled and not in use.
 */
export async function fetchWorkers(): Promise<WorkerSummaryDto[]> {
  const all = await liveTrading.workersList();
  return all.filter((w) => w.isActive);
}

/**
 * Change worker mode between PAPER / LIVE.
 */
export async function updateWorkerMode(
  workerId: number,
  mode: WorkerMode,
): Promise<void> {
  await liveTrading.setWorkerMode(workerId, mode);
}

/**
 * Enable / pause worker trading.
 * isActive = true → trading active; isActive = false → trading paused.
 */
export async function updateWorkerActive(
  workerId: number,
  isActive: boolean,
): Promise<void> {
  await liveTrading.setWorkerActive(workerId, isActive);
}

/**
 * Set daily trading capital for a worker.
 */
export async function setWorkerDailyCapital(
  workerId: number,
  dailyCapital: number,
): Promise<void> {
  await liveTrading.setWorkerDailyCapital(workerId, dailyCapital);
}

/**
 * Reset worker daily state (and optionally override daily capital).
 */
export async function resetWorkerDaily(
  workerId: number,
  payload: ResetWorkerDailyRequest,
): Promise<void> {
  await liveTrading.resetWorkerDaily(workerId, payload);
}
