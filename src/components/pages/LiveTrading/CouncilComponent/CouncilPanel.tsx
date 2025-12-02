import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./CouncilPanel.module.css";
import {
  councilApi,
  formatUtc,
  type CouncilOfferDto,
  type CouncilDecisionRequest,
  type CouncilSoldRequest,
  type RecommendationStatus,
} from "./council.logic";

interface CouncilPanelProps {
  ownerUserId?: number | null;
  autoRefreshMs?: number | null;
}

type Tab = "board" | "history" | "sold";
type BusyMap = Record<number, boolean>;
type PriceInputMap = Record<number, string>;

const statusClass = (status: RecommendationStatus) => {
  switch (status) {
    case "PENDING_USER":
      return `${styles.badgeSoft} ${styles.badgePending}`;
    case "ACCEPTED":
      return `${styles.badgeSoft} ${styles.badgeAccepted}`;
    case "REJECTED":
      return `${styles.badgeSoft} ${styles.badgeRejected}`;
    case "EXPIRED":
      return `${styles.badgeSoft} ${styles.badgeExpired}`;
    case "READY_TO_SELL":
      return `${styles.badgeSoft} ${styles.badgeReadySell}`;
    case "SOLD":
      return `${styles.badgeSoft} ${styles.badgeSold}`;
    default:
      return styles.badgeSoft;
  }
};

function countdown(expiresAtUtc: string): { label: string; danger: boolean } {
  const now = Date.now();
  const target = new Date(expiresAtUtc).getTime();
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    label: `${minutes}:${seconds.toString().padStart(2, "0")} left`,
    danger: totalSeconds <= 30,
  };
}

function formatPct(val?: number | null): string {
  if (val == null || Number.isNaN(val)) return "n/a";
  return `${val.toFixed(2)}%`;
}

function formatMoney(val?: number | null): string {
  if (val == null || Number.isNaN(val)) return "n/a";
  return val.toFixed(2);
}

function formatAnalysis(minutes?: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return "n/a";
  return `${Math.round(minutes)}m`;
}

function shortTimeAgo(iso: string): string {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export const CouncilPanel: React.FC<CouncilPanelProps> = ({
  ownerUserId = null,
  autoRefreshMs = 5000,
}) => {
  const [active, setActive] = useState<CouncilOfferDto[]>([]);
  const [accepted, setAccepted] = useState<CouncilOfferDto[]>([]);
  const [history, setHistory] = useState<CouncilOfferDto[]>([]);
  const [tab, setTab] = useState<Tab>("board");
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus | "ALL">("ALL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyMap>({});
  const [soldInputs, setSoldInputs] = useState<PriceInputMap>({});
  const [decisionNote, setDecisionNote] = useState<string>("");

  const ownerParam = ownerUserId ?? undefined;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeRes, acceptedRes, historyRes] = await Promise.all([
        councilApi.fetchActive(ownerParam),
        councilApi.fetchAccepted(ownerParam),
        councilApi.fetchHistory(ownerParam, 24),
      ]);
      setActive(activeRes ?? []);
      setAccepted(acceptedRes ?? []);
      setHistory(historyRes ?? []);
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to load council offers.");
    } finally {
      setLoading(false);
    }
  }, [ownerParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const id = window.setInterval(() => {
      void load();
    }, autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs, load]);

  const markBusy = (id: number, val: boolean) =>
    setBusy((prev) => ({ ...prev, [id]: val }));

  async function handleDecision(
    offer: CouncilOfferDto,
    decision: "ACCEPT" | "REJECT",
  ) {
    try {
      markBusy(offer.recommendationId, true);
      const body: CouncilDecisionRequest = {
        decision,
        decisionNote: decisionNote || undefined,
      };
      await councilApi[decision === "ACCEPT" ? "accept" : "reject"](
        offer.recommendationId,
        body,
      );
      setDecisionNote("");
      await load();
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to send decision.");
    } finally {
      markBusy(offer.recommendationId, false);
    }
  }

  async function handleSold(offer: CouncilOfferDto) {
    const raw = soldInputs[offer.recommendationId] ?? "";
    const price = parseFloat(raw);
    const body: CouncilSoldRequest = {};
    if (Number.isFinite(price)) body.soldPrice = price;

    try {
      markBusy(offer.recommendationId, true);
      await councilApi.sold(offer.recommendationId, body);
      await load();
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to mark as sold.");
    } finally {
      markBusy(offer.recommendationId, false);
    }
  }

  const filteredHistory = useMemo(() => {
    if (statusFilter === "ALL") return history;
    return history.filter((h) => h.recommendationStatus === statusFilter);
  }, [history, statusFilter]);

  const soldHistory = useMemo(
    () => history.filter((h) => h.recommendationStatus === "SOLD"),
    [history],
  );

  const nearExpiryIds = useMemo(() => {
    const now = Date.now();
    const soon = 60_000; // 1m
    return new Set(
      active
        .filter((o) => new Date(o.expiresAtUtc).getTime() - now <= soon)
        .map((o) => o.recommendationId),
    );
  }, [active]);

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.title}>Council Kitchen Board</h2>
          <p className={styles.subtitle}>
            New tickets appear on the main board. Accepted tickets move to the watched side panel;
            sold and expired tickets move into history.
          </p>
        </div>
        <div className={styles.badgeRow}>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <span className={styles.badgeSoft}>
            Active: {active.length} | Watching: {accepted.length}
          </span>
        </div>
      </header>

      <div className={styles.tabsRow}>
        <button
          className={`${styles.tabBtn} ${tab === "board" ? styles.tabActive : ""}`}
          onClick={() => setTab("board")}
        >
          Main board
        </button>
        <button
          className={`${styles.tabBtn} ${tab === "sold" ? styles.tabActive : ""}`}
          onClick={() => setTab("sold")}
        >
          Sold
        </button>
        <button
          className={`${styles.tabBtn} ${tab === "history" ? styles.tabActive : ""}`}
          onClick={() => setTab("history")}
        >
          History (24h)
        </button>
      </div>

      {tab === "board" && (
        <div className={styles.boardGrid}>
          <div className={styles.column}>
            <div className={styles.subHeader}>New offers (3m TTL)</div>
            {active.length === 0 && (
              <p className={styles.empty}>No fresh offers right now.</p>
            )}
            {active.map((offer) => {
              const cd = countdown(offer.expiresAtUtc);
              const isBusy = busy[offer.recommendationId];
              const nearExpiry = nearExpiryIds.has(offer.recommendationId);
              return (
                <article
                  key={offer.recommendationId}
                  className={`${styles.offerCard} ${nearExpiry ? styles.offerExpiring : ""}`}
                >
                  <div className={styles.offerHeader}>
                    <div className={styles.badgeRow}>
                      <span className={statusClass(offer.recommendationStatus)}>
                        {offer.recommendationStatus}
                      </span>
                      <span
                        className={`${styles.badgeSoft} ${
                          offer.side === "BUY" ? styles.badgeSideBuy : styles.badgeSideSell
                        }`}
                      >
                        {offer.side} {offer.symbol}
                      </span>
                      <span className={styles.badgeSoft}>
                        {offer.strategyName} | worker #{offer.workerId}
                      </span>
                      <span className={styles.badgeSoft}>
                        {offer.timeframeCode} | {formatAnalysis(offer.analysisMinutes)} prep
                      </span>
                    </div>
                    <div className={styles.badgeRow}>
                      <span className={styles.badgeSoft}>
                        Created {shortTimeAgo(offer.createdAtUtc)}
                      </span>
                      <span
                        className={`${styles.badgeSoft} ${
                          cd.danger ? styles.badgeDanger : ""
                        }`}
                      >
                        {cd.label}
                      </span>
                    </div>
                  </div>

                  <div className={styles.offerBody}>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Entry</div>
                      <div className={styles.valueCol}>
                        <div className={styles.small}>
                          Side:{" "}
                          <strong
                            className={offer.side === "BUY" ? styles.pos : styles.neg}
                          >
                            {offer.side}
                          </strong>{" "}
                          @ <span className={styles.priceValue}>{offer.suggestedPrice}</span>
                        </div>
                        <div className={styles.small}>
                          Size: <span className={styles.mono}>{formatMoney(offer.sizeValue)}</span>
                        </div>
                        <div className={styles.small}>
                          SL:{" "}
                          {offer.stopLoss != null ? (
                            <span className={styles.mono}>{offer.stopLoss}</span>
                          ) : (
                            <span className={styles.dim}>none</span>
                          )}{" "}
                          | TP:{" "}
                          {offer.takeProfit != null ? (
                            <span className={styles.mono}>{offer.takeProfit}</span>
                          ) : (
                            <span className={styles.dim}>none</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.labelCol}>Alpha</div>
                      <div className={styles.valueCol}>
                        <div className={styles.small}>
                          Expected return: {formatPct(offer.expectedReturnPct)} | Profit:
                          {` ${formatMoney(offer.expectedProfitValue)}`}
                        </div>
                        <div className={styles.confidenceBar}>
                          <div
                            className={styles.confidenceFill}
                            style={{ width: `${(offer.confidence ?? 0) * 100}%` }}
                          />
                          <span className={styles.confidenceLabel}>
                            {(offer.confidence ?? 0) * 100 > 0
                              ? `${((offer.confidence ?? 0) * 100).toFixed(1)}%`
                              : "no confidence provided"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.controlsRow}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={isBusy}
                      onClick={() => void handleDecision(offer, "ACCEPT")}
                    >
                      Accept
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      disabled={isBusy}
                      onClick={() => void handleDecision(offer, "REJECT")}
                    >
                      Reject
                    </button>
                    <textarea
                      className={styles.textarea}
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      placeholder="Optional note sent with your decision."
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.columnWide}>
            <div className={styles.subHeader}>Active / accepted (watched)</div>
            {accepted.length === 0 && (
              <p className={styles.empty}>No accepted offers yet. Accept one to start tracking.</p>
            )}
            {accepted.map((offer) => {
              const isBusy = busy[offer.recommendationId];
              const sell = offer.sellSuggestion;
              return (
                <article
                  key={offer.recommendationId}
                  className={`${styles.offerCard} ${sell ? styles.offerSell : ""}`}
                >
                  <div className={styles.offerHeader}>
                    <div className={styles.badgeRow}>
                      <span className={statusClass(offer.recommendationStatus)}>
                        {offer.recommendationStatus}
                      </span>
                      <span
                        className={`${styles.badgeSoft} ${
                          offer.side === "BUY" ? styles.badgeSideBuy : styles.badgeSideSell
                        }`}
                      >
                        {offer.side} {offer.symbol}
                      </span>
                      <span className={styles.badgeSoft}>
                        {offer.strategyName} | worker #{offer.workerId}
                      </span>
                      <span className={styles.badgeSoft}>
                        Size {formatMoney(offer.sizeValue)} | SL {offer.stopLoss ?? "n/a"} | TP{" "}
                        {offer.takeProfit ?? "n/a"}
                      </span>
                      <span className={styles.badgeSoft}>
                        Analysis {formatAnalysis(offer.analysisMinutes)}
                      </span>
                    </div>
                    <div className={styles.badgeRow}>
                      <span className={styles.badgeSoft}>
                        Accepted {shortTimeAgo(offer.createdAtUtc)}
                      </span>
                      {sell && (
                        <span className={`${styles.badgeSoft} ${styles.badgeReadySell}`}>
                          Sell suggested
                        </span>
                      )}
                    </div>
                  </div>

                  {sell && (
                    <div className={styles.sellBox}>
                      <div className={styles.small}>
                        Exit: {sell.side} @ {sell.suggestedPrice ?? "n/a"} | Exp. return{" "}
                        {formatPct(sell.expectedReturnPct)}
                      </div>
                      <div className={styles.small}>
                        Confidence {formatPct((sell.confidence ?? 0) * 100)} | Scope{" "}
                        {sell.scope ?? "n/a"}
                      </div>
                    </div>
                  )}

                  <div className={styles.controlsRow}>
                    <input
                      className={styles.inputSm}
                      type="number"
                      value={soldInputs[offer.recommendationId] ?? ""}
                      onChange={(e) =>
                        setSoldInputs((prev) => ({
                          ...prev,
                          [offer.recommendationId]: e.target.value,
                        }))
                      }
                      placeholder="Sold price (optional)"
                    />
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={isBusy}
                      onClick={() => void handleSold(offer)}
                    >
                      Mark sold
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {tab === "sold" && (
        <div>
          <div className={styles.subHeader}>Sold tickets (user-confirmed)</div>
          {soldHistory.length === 0 && <p className={styles.empty}>Nothing sold in the last 24h.</p>}
          {soldHistory.map((item) => (
            <article key={item.recommendationId} className={styles.offerCard}>
              <div className={styles.offerHeader}>
                <div className={styles.badgeRow}>
                  <span className={statusClass(item.recommendationStatus)}>
                    {item.recommendationStatus}
                  </span>
                  <span className={styles.badgeSoft}>
                    {item.side} {item.symbol} | {item.strategyName}
                  </span>
                  <span className={styles.badgeSoft}>
                    Analysis {formatAnalysis(item.analysisMinutes)}
                  </span>
                </div>
                <div className={styles.badgeRow}>
                  <span className={styles.badgeSoft}>
                    Enter @ {item.suggestedPrice} | Size {formatMoney(item.sizeValue)}
                  </span>
                  <span className={styles.badgeSoft}>Created {formatUtc(item.createdAtUtc)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div>
          <div className={styles.historyHeader}>
            <div className={styles.subHeader}>History (24h)</div>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RecommendationStatus | "ALL")}
            >
              <option value="ALL">All</option>
              <option value="PENDING_USER">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="READY_TO_SELL">Ready to sell</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
          {filteredHistory.length === 0 && (
            <p className={styles.empty}>No history items in the last 24h.</p>
          )}
          <div className={styles.historyList}>
            {filteredHistory.map((item) => (
              <div key={item.recommendationId} className={styles.historyRow}>
                <div className={styles.badgeRow}>
                  <span className={statusClass(item.recommendationStatus)}>
                    {item.recommendationStatus}
                  </span>
                  <span className={styles.badgeSoft}>
                    {item.side} {item.symbol} | {item.strategyName}
                  </span>
                  <span className={styles.badgeSoft}>{item.timeframeCode}</span>
                  <span className={styles.badgeSoft}>
                    Analysis {formatAnalysis(item.analysisMinutes)}
                  </span>
                </div>
                <div className={styles.small}>
                  Entry {item.suggestedPrice} | Size {formatMoney(item.sizeValue)} | SL{" "}
                  {item.stopLoss ?? "n/a"} | TP {item.takeProfit ?? "n/a"} | Exp ret{" "}
                  {formatPct(item.expectedReturnPct)}
                </div>
                <div className={styles.small}>
                  Created {formatUtc(item.createdAtUtc)} | Signal {formatUtc(item.signalCreatedAtUtc)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}
    </section>
  );
};
