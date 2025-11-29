// src/components/pages/LiveTrading/CouncilComponent/CouncilPanel.tsx

import React, { useCallback, useEffect, useState } from "react";
import styles from "./CouncilPanel.module.css";
import {
  type CouncilRecommendationDto,
  type CouncilDecisionRequest,
  fetchLatestCouncilRecommendation,
  formatUtc,
  postCouncilDecision,
} from "./council.logic";

interface CouncilPanelProps {
  ownerUserId?: number | null;
  autoRefreshMs?: number | null;
}

type DecisionState = "idle" | "submitting" | "done";

export const CouncilPanel: React.FC<CouncilPanelProps> = ({
  ownerUserId = null,
  autoRefreshMs = 10_000,
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] =
    useState<CouncilRecommendationDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [userTotalEquity, setUserTotalEquity] = useState<string>("");
  const [userCash, setUserCash] = useState<string>("");
  const [userInPositions, setUserInPositions] = useState<string>("");

  const [decisionState, setDecisionState] =
    useState<DecisionState>("idle");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rec = await fetchLatestCouncilRecommendation(
        ownerUserId ?? undefined,
      );
      setRecommendation(rec);
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message ??
          "Failed to load council recommendation.",
      );
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

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

  function statusClass(status: string): string {
    switch (status) {
      case "PENDING_USER":
        return `${styles.badgeSoft} ${styles.badgePending}`;
      case "ACCEPTED":
        return `${styles.badgeSoft} ${styles.badgeAccepted}`;
      case "REJECTED":
        return `${styles.badgeSoft} ${styles.badgeRejected}`;
      case "EXPIRED":
        return `${styles.badgeSoft} ${styles.badgeExpired}`;
      default:
        return styles.badgeSoft;
    }
  }

  async function handleDecision(decision: "ACCEPT" | "REJECT") {
    if (!recommendation) return;
    try {
      setDecisionState("submitting");
      setError(null);

      const body: CouncilDecisionRequest = {
        decision,
        decisionNote: note || undefined,
      };

      const eq = parseFloat(userTotalEquity);
      const cash = parseFloat(userCash);
      const inPos = parseFloat(userInPositions);

      if (!Number.isNaN(eq)) body.userTotalEquity = eq;
      if (!Number.isNaN(cash)) body.userCashAvailable = cash;
      if (!Number.isNaN(inPos)) body.userCapitalInPositions = inPos;

      await postCouncilDecision(
        recommendation.recommendationId,
        body,
      );
      setDecisionState("done");

      // Refetch so UI sees updated status / possibly next signal
      void load();
    } catch (err) {
      console.error(err);
      setDecisionState("idle");
      setError(
        (err as Error).message ?? "Failed to submit decision.",
      );
    }
  }

  const rec = recommendation;

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.title}>Council Recommendation</h2>
          <p className={styles.subtitle}>
            Real-time best trade candidate, aggregated from your
            workers.
          </p>
        </div>
        <div>
          <div className={styles.badgeRow}>
            <span
              className={statusClass(
                rec?.recommendationStatus ?? "—",
              )}
            >
              {rec ? rec.recommendationStatus : "No signal"}
            </span>
            {rec && (
              <>
                <span
                  className={`${styles.badgeSoft} ${
                    rec.side === "BUY"
                      ? styles.badgeSideBuy
                      : styles.badgeSideSell
                  }`}
                >
                  {rec.side} {rec.symbol}
                </span>
                <span className={styles.badgeSoft}>
                  {rec.strategyName} · worker #{rec.workerId}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {loading && (
        <p className={styles.small}>
          Loading council recommendation…
        </p>
      )}

      {!loading && !rec && (
        <p className={styles.empty}>
          No active council recommendation right now. As soon as your
          workers emit fresh signals, the council will surface the best
          candidate here.
        </p>
      )}

      {!loading && rec && (
        <>
          <div className={styles.row}>
            <div className={styles.labelCol}>Instrument</div>
            <div className={styles.valueCol}>
              <div className={styles.small}>
                <span className={styles.mono}>{rec.symbol}</span>
                {rec.symbolName ? ` · ${rec.symbolName}` : ""}
                {` · ${rec.timeframeCode} (${rec.timeframeMinutes}m)`}
              </div>
              <div className={styles.small}>
                Worker{" "}
                <span className={styles.mono}>
                  {rec.workerName} (#{rec.workerId})
                </span>{" "}
                using{" "}
                <span className={styles.mono}>
                  {rec.strategyName}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.labelCol}>Entry / Risk</div>
            <div className={styles.valueCol}>
              <div className={styles.small}>
                Side:{" "}
                <strong
                  className={
                    rec.side === "BUY"
                      ? styles.pos
                      : rec.side === "SELL"
                      ? styles.neg
                      : ""
                  }
                >
                  {rec.side}
                </strong>{" "}
                at{" "}
                <span className={styles.priceValue}>
                  {rec.suggestedPrice.toFixed(4)}
                </span>
              </div>
              <div className={styles.small}>
                Stop:{" "}
                {rec.stopLoss != null ? (
                  <span className={styles.mono}>
                    {rec.stopLoss.toFixed(4)}
                  </span>
                ) : (
                  <span className={styles.dim}>none</span>
                )}{" "}
                · Take-profit:{" "}
                {rec.takeProfit != null ? (
                  <span className={styles.mono}>
                    {rec.takeProfit.toFixed(4)}
                  </span>
                ) : (
                  <span className={styles.dim}>none</span>
                )}
              </div>
              <div className={styles.small}>
                Notional size ≈{" "}
                <span className={styles.mono}>
                  {rec.sizeValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.labelCol}>Alpha</div>
            <div className={styles.valueCol}>
              <div className={styles.small}>
                Expected return:{" "}
                {rec.expectedReturnPct != null ? (
                  <span
                    className={
                      rec.expectedReturnPct >= 0
                        ? styles.pos
                        : styles.neg
                    }
                  >
                    {rec.expectedReturnPct.toFixed(2)}%
                  </span>
                ) : (
                  <span className={styles.dim}>n/a</span>
                )}{" "}
                · Expected profit:{" "}
                {rec.expectedProfitValue != null ? (
                  <span
                    className={
                      rec.expectedProfitValue >= 0
                        ? styles.pos
                        : styles.neg
                    }
                  >
                    {rec.expectedProfitValue.toFixed(2)}
                  </span>
                ) : (
                  <span className={styles.dim}>n/a</span>
                )}
              </div>
              <div className={styles.small}>
                Confidence:{" "}
                {rec.confidence != null ? (
                  <span className={styles.mono}>
                    {(rec.confidence * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className={styles.dim}>not provided</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.labelCol}>Timing</div>
            <div className={styles.valueCol}>
              <div className={styles.small}>
                Signal created:{" "}
                <span className={styles.mono}>
                  {formatUtc(rec.signalCreatedAtUtc)}
                </span>
              </div>
              <div className={styles.small}>
                Valid until:{" "}
                <span className={styles.mono}>
                  {formatUtc(rec.signalValidUntilUtc)}
                </span>
              </div>
              <div className={styles.small}>
                Latest candle open:{" "}
                <span className={styles.mono}>
                  {formatUtc(rec.latestCandleOpenTimeUtc)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.inputsRow}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Total equity</label>
              <input
                className={styles.input}
                type="number"
                value={userTotalEquity}
                onChange={(e) =>
                  setUserTotalEquity(e.target.value)
                }
                placeholder="e.g. 10 000"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Cash available
              </label>
              <input
                className={styles.input}
                type="number"
                value={userCash}
                onChange={(e) => setUserCash(e.target.value)}
                placeholder="e.g. 3 000"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Capital in positions
              </label>
              <input
                className={styles.input}
                type="number"
                value={userInPositions}
                onChange={(e) =>
                  setUserInPositions(e.target.value)
                }
                placeholder="e.g. 7 000"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.labelCol}>Note to workers</div>
            <div className={styles.valueCol}>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional comment. This will be stored in council_recommendations.decision_note and appended to strategy_signals.decision_note so Python workers can adapt."
              />
              <p
                className={`${styles.small} ${styles.hint}`}
              >
                Council forwards your decision + note back to
                workers; they can update risk and position sizing
                based on your account state.
              </p>
            </div>
          </div>

          <div className={styles.controlsRow}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={
                decisionState === "submitting" ||
                rec.recommendationStatus !== "PENDING_USER"
              }
              onClick={() => void handleDecision("ACCEPT")}
            >
              ✅ Accept trade
            </button>
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={
                decisionState === "submitting" ||
                rec.recommendationStatus !== "PENDING_USER"
              }
              onClick={() => void handleDecision("REJECT")}
            >
              ❌ Reject
            </button>
            <button
              className={`${styles.btn} ${styles.btnSm}`}
              disabled={loading}
              onClick={() => void load()}
            >
              🔄 Refresh
            </button>
          </div>
        </>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}
      {decisionState === "done" && !error && (
        <div className={styles.infoBox}>
          Decision sent to council. Workers will see the updated
          status on this signal and can adapt allocations accordingly.
        </div>
      )}
    </section>
  );
};
