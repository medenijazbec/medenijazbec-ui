// path: src/controllers/nvdaTrading.ts
import { http } from "@/api/api";

// These mirror the C# record DTOs in NvdaTradingController
// Property names are camelCase to match your updated API.

export type TradingSettingsDto = {
  symbol: string;
  timeframeCode: string;
  timeframeMinutes: number;
  dataProvider: string;
  initialCapitalPerWorker: number;
  historicalCandles: number;
  updatedUtc: string;
};

export type UpdateTradingSettingsRequest = {
  symbol: string;
  timeframeCode: string;
  timeframeMinutes: number;
  dataProvider: string;
  initialCapitalPerWorker: number;
  historicalCandles: number;
};

export type WorkerOverviewDto = {
  id: number;
  name: string;
  strategyName: string;
  initialCapital: number;
  equity: number | null;
  cash: number | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  openPositions: number | null;
  totalTrades: number | null;
  snapshotUtc: string | null;
  ownerUserId: string | null;
};

export type WorkerEquityPointDto = {
  snapshotUtc: string;
  equity: number;
};

export type MarketClockDto = {
  exchange: string;
  isOpenNow: boolean;
  nowUtc: string;
  nowLjubljana: string;
  currentSessionOpenUtc: string;
  currentSessionCloseUtc: string;
  currentSessionOpenLjubljana: string;
  currentSessionCloseLjubljana: string;
  nextSessionOpenUtc: string;
  nextSessionOpenLjubljana: string;
};

// Candles used for the new trading charts
export type CandleWithFeaturesDto = {
  openTimeUtc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  range: number | null;
  body: number | null;
  upperWick: number | null;
  lowerWick: number | null;
  bodyRatio: number | null;
  bodyPos: number | null;
  pos20: number | null;
  pos50: number | null;
  bullish: boolean;
  doji: boolean;
  hammer: boolean;
  shootingStar: boolean;
};

export const nvdaTrading = {
  // GET /api/nvda-trading/settings
  getSettings: () =>
    http.get<TradingSettingsDto>("/api/nvda-trading/settings"),

  // POST /api/nvda-trading/settings (Admin)
  updateSettings: (body: UpdateTradingSettingsRequest) =>
    http.post<TradingSettingsDto>("/api/nvda-trading/settings", body),

  // GET /api/nvda-trading/workers
  getWorkers: () =>
    http.get<WorkerOverviewDto[]>("/api/nvda-trading/workers"),

  // GET /api/nvda-trading/workers/{id}/equity?hoursBack=24
  getWorkerEquity: (workerId: number, hoursBack = 24) =>
    http.get<WorkerEquityPointDto[]>(
      `/api/nvda-trading/workers/${workerId}/equity`,
      { hoursBack }
    ),

  // GET /api/nvda-trading/market-clock?exchange=NYSE
  getMarketClock: (exchange: string = "NYSE") =>
    http.get<MarketClockDto>("/api/nvda-trading/market-clock", { exchange }),

  // GET /api/nvda-trading/candles?symbol=NVDA&timeframeCode=1m&limit=300
  // Backend can ignore symbol/timeframe for now; we’ll wire it later.
  getCandles: (symbol: string, timeframeCode: string, limit = 300) =>
    http.get<CandleWithFeaturesDto[]>("/api/nvda-trading/candles", {
      symbol,
      timeframeCode,
      limit,
    }),
};
