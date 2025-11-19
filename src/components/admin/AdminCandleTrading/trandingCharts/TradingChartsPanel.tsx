import React, { useMemo, useState } from "react";
import styles from "./TradingChartsPanel.module.css";
import TradingChartCard from "./TradingChartCard";
import {
  DEFAULT_SYMBOLS,
  type SymbolConfig,
} from "./trandingCharts.logic";

type ViewMode = "single" | "all";

export default function TradingChartsPanel() {
  const [available] = useState<SymbolConfig[]>(DEFAULT_SYMBOLS);

  // Symbols the user has in their watchlist (local for now)
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["NVDA"]);

  // Main symbol when in "single" mode or focused
  const [mainSymbol, setMainSymbol] = useState<string>("NVDA");

  const [mode, setMode] = useState<ViewMode>("single");

  const handleFocusChart = (symbol: string) => {
    setMainSymbol(symbol);
    setMode("single");
  };

  const toggleSelected = (symbol: string) => {
    setSelectedSymbols((prev) => {
      let next: string[];

      if (prev.includes(symbol)) {
        // remove
        next = prev.filter((s) => s !== symbol);
      } else {
        // add
        next = [...prev, symbol];
      }

      if (next.length === 1) {
        // if only one symbol remains, make it main + go to single mode
        setMainSymbol(next[0]);
        setMode("single");
      } else if (next.length > 1) {
        // selecting multiple symbols automatically switches to "all" view
        setMode("all");
      }

      return next;
    });
  };

  const configsBySymbol = useMemo(
    () =>
      new Map<string, SymbolConfig>(
        available.map((cfg) => [cfg.symbol, cfg])
      ),
    [available]
  );

  const renderConfigs: SymbolConfig[] = useMemo(() => {
    if (mode === "single") {
      const cfg =
        configsBySymbol.get(mainSymbol) ||
        configsBySymbol.get("NVDA") ||
        available[0];
      return cfg ? [cfg] : [];
    }

    // "All charts" mode: one card per selected symbol.
    // If selection is empty, fall back to NVDA.
    const list =
      selectedSymbols.length > 0 ? selectedSymbols : ["NVDA"];

    return list
      .map((sym) => configsBySymbol.get(sym))
      .filter((x): x is SymbolConfig => !!x);
  }, [mode, mainSymbol, selectedSymbols, configsBySymbol, available]);

  return (
    <section className={styles.section}>
      <header className={styles.headerRow}>
        <div>
          <h2 className={styles.h2}>Trading charts</h2>
          <p className={styles.meta}>
            Desktop-first candlestick panels in the same phosphor style as
            the fitness pages. Choose a primary symbol (e.g. NVIDIA) or
            view all of your selected stocks stacked vertically.
          </p>
        </div>
        <div className={styles.modeSwitch}>
          <button
            type="button"
            className={`${styles.modeBtn} ${
              mode === "single" ? styles.modeBtnActive : ""
            }`}
            onClick={() => setMode("single")}
          >
            Main only
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${
              mode === "all" ? styles.modeBtnActive : ""
            }`}
            onClick={() => setMode("all")}
          >
            All charts
          </button>
        </div>
      </header>

      <div className={styles.controlsRow}>
        <div className={styles.controlBlock}>
          <div className={styles.label}>Watchlist</div>
          <div className={styles.symbolPills}>
            {available.map((cfg) => {
              const active = selectedSymbols.includes(cfg.symbol);
              return (
                <button
                  key={cfg.symbol}
                  type="button"
                  className={`${styles.symbolPill} ${
                    active ? styles.symbolPillActive : ""
                  }`}
                  onClick={() => toggleSelected(cfg.symbol)}
                >
                  <span className={styles.symbolCode}>
                    {cfg.symbol}
                  </span>
                  <span className={styles.symbolName}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.meta}>
            These live in local state for now. Later we&apos;ll persist
            this watchlist per user in the backend.
          </div>
        </div>

        <div className={styles.controlBlock}>
          <div className={styles.label}>Main symbol</div>
          <select
            className={styles.select}
            value={mainSymbol}
            onChange={(e) => {
              const sym = e.target.value;
              setMainSymbol(sym);
              // if user explicitly picks a main symbol, go to single mode
              setMode("single");
              // ensure it’s in the watchlist if nothing else is selected
              setSelectedSymbols((prev) =>
                prev.length === 0 || !prev.includes(sym)
                  ? [...new Set([...prev, sym])]
                  : prev
              );
            }}
          >
            {available.map((cfg) => (
              <option key={cfg.symbol} value={cfg.symbol}>
                {cfg.symbol} · {cfg.label}
              </option>
            ))}
          </select>
          <div className={styles.meta}>
            Used when <b>Main only</b> is active.
          </div>
        </div>
      </div>

      <div className={styles.chartsColumn}>
        {renderConfigs.map((cfg) => (
          <TradingChartCard
            key={cfg.symbol}
            config={cfg}
            isFocused={cfg.symbol === mainSymbol}
            onFocus={() => handleFocusChart(cfg.symbol)}
          />
        ))}
      </div>
    </section>
  );
}
