// path: src/components/admin/AdminTradingConfig/AdminTradingConfig.tsx
import React, { useMemo } from "react";
import styles from "./AdminTradingConfig.module.css";
import {
  useTradingSettingsAdmin,
  useApiProvidersAdmin,
  useApiKeysAdmin,
} from "./adminTradingConfig.logic";

const AdminTradingConfig: React.FC = () => {
  // Trading settings (symbol / timeframe / provider)
  const {
    rows: settings,
    form: settingsForm,
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    create: createSetting,
    remove: deleteSetting,
    updateField: updateSettingsField,
    reload: reloadSettings,
  } = useTradingSettingsAdmin();

  // API providers
  const {
    providers,
    loading: providersLoading,
    saving: providersSaving,
    error: providersError,
    form: providerForm,
    updateField: updateProviderField,
    create: createProvider,
    reload: reloadProviders,
  } = useApiProvidersAdmin();

  // API keys
  const {
    keys,
    loading: keysLoading,
    saving: keysSaving,
    error: keysError,
    form: keyForm,
    updateField: updateKeyField,
    create: createKey,
    reload: reloadKeys,
  } = useApiKeysAdmin();

  const providerOptions = useMemo(
    () =>
      providers.map((p) => ({
        id: p.id,
        label: `${p.code} · ${p.name}`,
      })),
    [providers]
  );

  return (
    <section className={styles.section}>
      <header className={styles.headerRow}>
        <div>
          <h2 className={styles.h2}>Trading infra (candles + API keys)</h2>
          <p className={styles.meta}>
            Admin view for the candle trading lab. Configure{" "}
            <code>trading_settings</code> (symbols / timeframes / providers)
            and wire up <code>api_providers</code> + <code>api_keys</code>{" "}
            used by the Python engine and Tor workers. This replaces manual SQL
            like <code>INSERT INTO trading_settings</code> or{" "}
            <code>INSERT INTO api_keys</code> with a safer panel.
          </p>
        </div>
      </header>

      {/* Top grid: trading_settings + providers */}
      <div className={styles.grid}>
        {/* -------- Trading settings card -------- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.h3}>Trading settings</h3>
            <div className={styles.badgeRow}>
              <span className={styles.badgeSoft}>
                Rows: {settings.length || 0}
              </span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={reloadSettings}
                disabled={settingsLoading || settingsSaving}
              >
                Reload
              </button>
            </div>
          </div>
          <p className={styles.meta}>
            Backed by <code>trading_settings</code>. Each row is a
            symbol/timeframe/data provider combo that will be claimed by a Tor
            worker (1 symbol per worker). This is the UI equivalent of:
          </p>
          <pre className={styles.pre}>
            INSERT INTO trading_settings
            {"\n"}  (symbol, timeframe_code, timeframe_minutes, data_provider,
            {"\n"}   initial_capital_per_worker, historical_candles,
            updated_utc)
            {"\n"}VALUES
            {"\n"}  (&apos;NVDA&apos;, &apos;1m&apos;, 1, &apos;twelvedata&apos;,
            0, 200, UTC_TIMESTAMP()),
            {"\n"}  (&apos;AMD&apos; , &apos;1m&apos;, 1,
            &apos;twelvedata&apos;, 0, 200, UTC_TIMESTAMP()),
            {"\n"}  (&apos;TSM&apos; , &apos;1m&apos;, 1,
            &apos;twelvedata&apos;, 0, 200, UTC_TIMESTAMP());
          </pre>

          {settingsError && (
            <div className={styles.errorBox}>{settingsError}</div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Symbol</th>
                  <th>TF code</th>
                  <th>Minutes</th>
                  <th>Provider</th>
                  <th>Hist</th>
                  <th>Init cap</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settingsLoading && !settings.length && (
                  <tr>
                    <td colSpan={9} className={styles.small}>
                      Loading trading settings…
                    </td>
                  </tr>
                )}
                {!settingsLoading && !settings.length && (
                  <tr>
                    <td colSpan={9} className={styles.small}>
                      No trading settings yet. Add NVDA / AMD / TSM below.
                    </td>
                  </tr>
                )}
                {settings.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.kbd}>{s.id}</td>
                    <td>{s.symbol}</td>
                    <td>{s.timeframeCode}</td>
                    <td>{s.timeframeMinutes}</td>
                    <td>{s.dataProvider}</td>
                    <td>{s.historicalCandles}</td>
                    <td>{s.initialCapitalPerWorker.toFixed(2)}</td>
                    <td className={styles.kbd}>
                      {s.updatedUtc
                        ? new Date(s.updatedUtc).toISOString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSm}`}
                        onClick={() => deleteSetting(s.id)}
                        disabled={settingsSaving}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New setting form */}
          <div className={styles.formBlock}>
            <div className={styles.formHeader}>Add trading setting</div>
            <div className={styles.row}>
              <label>Symbol</label>
              <input
                className={styles.input}
                value={settingsForm.symbol}
                onChange={(e) =>
                  updateSettingsField("symbol", e.target.value)
                }
                placeholder="NVDA / AMD / TSM"
              />
            </div>
            <div className={styles.row}>
              <label>Timeframe</label>
              <input
                className={styles.input}
                value={settingsForm.timeframeCode}
                onChange={(e) =>
                  updateSettingsField("timeframeCode", e.target.value)
                }
                placeholder="1m / 5m / 15m"
              />
              <input
                className={styles.input}
                type="number"
                min={1}
                value={settingsForm.timeframeMinutes}
                onChange={(e) =>
                  updateSettingsField("timeframeMinutes", e.target.value)
                }
                placeholder="Minutes (1)"
              />
            </div>
            <div className={styles.row}>
              <label>Data provider</label>
              <select
                className={styles.select}
                value={settingsForm.dataProvider}
                onChange={(e) =>
                  updateSettingsField("dataProvider", e.target.value)
                }
              >
                <option value="twelvedata">twelvedata</option>
                <option value="alpha">alpha</option>
                <option value="finnhub">finnhub</option>
              </select>
            </div>
            <div className={styles.row}>
              <label>Initial cap / Hist candles</label>
              <input
                className={styles.input}
                type="number"
                value={settingsForm.initialCapitalPerWorker}
                onChange={(e) =>
                  updateSettingsField(
                    "initialCapitalPerWorker",
                    e.target.value
                  )
                }
                placeholder="0"
              />
              <input
                className={styles.input}
                type="number"
                value={settingsForm.historicalCandles}
                onChange={(e) =>
                  updateSettingsField("historicalCandles", e.target.value)
                }
                placeholder="200"
              />
            </div>
            <div className={styles.row}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createSetting}
                disabled={settingsSaving}
              >
                {settingsSaving ? "Saving…" : "Add setting"}
              </button>
            </div>
          </div>
        </div>

        {/* -------- API providers card -------- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.h3}>API providers</h3>
            <div className={styles.badgeRow}>
              <span className={styles.badgeSoft}>
                Providers: {providers.length || 0}
              </span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={reloadProviders}
                disabled={providersLoading || providersSaving}
              >
                Reload
              </button>
            </div>
          </div>
          <p className={styles.meta}>
            Backed by <code>api_providers</code>. Typical rows would be:
            <br />
            <code>alpha_vantage</code> and <code>twelvedata</code> with their
            base URLs, timezones and default quotas (e.g. 25/day + 5/min for
            Alpha, 800/day + 8/min for Twelve Data).
          </p>

          {providersError && (
            <div className={styles.errorBox}>{providersError}</div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Base URL</th>
                  <th>TZ</th>
                  <th>Daily</th>
                  <th>Per min</th>
                </tr>
              </thead>
              <tbody>
                {providersLoading && !providers.length && (
                  <tr>
                    <td colSpan={7} className={styles.small}>
                      Loading providers…
                    </td>
                  </tr>
                )}
                {!providersLoading && !providers.length && (
                  <tr>
                    <td colSpan={7} className={styles.small}>
                      No providers yet. Add alpha_vantage / twelvedata below.
                    </td>
                  </tr>
                )}
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.kbd}>{p.id}</td>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td className={styles.kbd}>{p.baseUrl ?? "—"}</td>
                    <td>{p.timezone ?? "UTC"}</td>
                    <td>{p.dailyQuotaDefault ?? "—"}</td>
                    <td>{p.perMinuteQuotaDefault ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New provider form */}
          <div className={styles.formBlock}>
            <div className={styles.formHeader}>Add provider</div>
            <div className={styles.row}>
              <label>Code / Name</label>
              <input
                className={styles.input}
                value={providerForm.code}
                onChange={(e) => updateProviderField("code", e.target.value)}
                placeholder="twelvedata / alpha_vantage"
              />
              <input
                className={styles.input}
                value={providerForm.name}
                onChange={(e) => updateProviderField("name", e.target.value)}
                placeholder="Twelve Data / Alpha Vantage"
              />
            </div>
            <div className={styles.row}>
              <label>Base URL</label>
              <input
                className={styles.input}
                value={providerForm.baseUrl}
                onChange={(e) =>
                  updateProviderField("baseUrl", e.target.value)
                }
                placeholder="https://api.twelvedata.com"
              />
            </div>
            <div className={styles.row}>
              <label>TZ / Quotas</label>
              <input
                className={styles.input}
                value={providerForm.timezone}
                onChange={(e) =>
                  updateProviderField("timezone", e.target.value)
                }
                placeholder="America/New_York"
              />
              <input
                className={styles.input}
                type="number"
                value={providerForm.dailyQuotaDefault}
                onChange={(e) =>
                  updateProviderField(
                    "dailyQuotaDefault",
                    e.target.value
                  )
                }
                placeholder="800"
              />
              <input
                className={styles.input}
                type="number"
                value={providerForm.perMinuteQuotaDefault}
                onChange={(e) =>
                  updateProviderField(
                    "perMinuteQuotaDefault",
                    e.target.value
                  )
                }
                placeholder="8"
              />
            </div>
            <div className={styles.row}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createProvider}
                disabled={providersSaving}
              >
                {providersSaving ? "Saving…" : "Add provider"}
              </button>
            </div>
          </div>
        </div>
      </div>

               <p>  </p>
      {/* API KEYS card (full width) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.h3}>API keys per provider</h3>
          <div className={styles.badgeRow}>
            <span className={styles.badgeSoft}>
              Keys: {keys.length || 0}
            </span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm}`}
              onClick={reloadKeys}
              disabled={keysLoading || keysSaving}
            >
              Reload
            </button>
          </div>
        </div>
        <p className={styles.meta}>
          Backed by <code>api_keys</code>, linked to <code>api_providers</code>{" "}
          via <code>provider_id</code>. This is where you add keys like:
          <br />
          <code>XJARYSWEVQU7DIFX</code> (Alpha free) or{" "}
          <code>211de4a710684511bddb1fa69aea1927</code> (Twelve Data Basic 8).
          The Python/Tor layer enforces 1 key ↔ 1 IP and the configured
          per-minute / daily quotas.
        </p>

        {keysError && <div className={styles.errorBox}>{keysError}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Provider</th>
                <th>Label</th>
                <th>API key</th>
                <th>Active</th>
                <th>Daily / min</th>
                <th>Calls today</th>
                <th>IP / burned</th>
                <th>Last window</th>
              </tr>
            </thead>
            <tbody>
              {keysLoading && !keys.length && (
                <tr>
                  <td colSpan={9} className={styles.small}>
                    Loading keys…
                  </td>
                </tr>
              )}
              {!keysLoading && !keys.length && (
                <tr>
                  <td colSpan={9} className={styles.small}>
                    No API keys yet. Add them below after providers exist.
                  </td>
                </tr>
              )}
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className={styles.kbd}>{k.id}</td>
                  <td>
                    {k.providerCode
                      ? k.providerCode
                      : `#${k.providerId}`}
                  </td>
                  <td>{k.label ?? "—"}</td>
                  <td className={styles.kbd}>{k.apiKey}</td>
                  <td>{k.isActive ? "yes" : "no"}</td>
                  <td>
                    {k.dailyQuota ?? "∅"} / {k.perMinuteQuota ?? "∅"}
                  </td>
                  <td>{k.callsToday}</td>
                  <td>
                    <div className={styles.small}>
                      <div>IP: {k.ipAddress ?? "—"}</div>
                      <div>Burned: {k.ipBurned ? "yes" : "no"}</div>
                    </div>
                  </td>
                  <td className={styles.small}>
                    {k.windowStartedAt
                      ? new Date(k.windowStartedAt).toISOString()
                      : "—"}
                    <br />
                    calls: {k.windowCalls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* New key form */}
        <div className={styles.formBlock}>
          <div className={styles.formHeader}>Add API key</div>
          <div className={styles.row}>
            <label>Provider</label>
            <select
              className={styles.select}
              value={keyForm.providerId}
              onChange={(e) =>
                updateKeyField("providerId", e.target.value)
              }
            >
              <option value="">Select provider…</option>
              {providerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <label>API key / Label</label>
            <input
              className={styles.input}
              value={keyForm.apiKey}
              onChange={(e) =>
                updateKeyField("apiKey", e.target.value)
              }
              placeholder="211de4a710684511bddb1fa69aea1927"
            />
            <input
              className={styles.input}
              value={keyForm.label}
              onChange={(e) =>
                updateKeyField("label", e.target.value)
              }
              placeholder="TD basic key 1"
            />
          </div>
          <div className={styles.row}>
            <label>Status / quotas</label>
            <select
              className={styles.select}
              value={keyForm.isActive}
              onChange={(e) =>
                updateKeyField("isActive", e.target.value)
              }
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
            <input
              className={styles.input}
              type="number"
              value={keyForm.dailyQuota}
              onChange={(e) =>
                updateKeyField("dailyQuota", e.target.value)
              }
              placeholder="800"
            />
            <input
              className={styles.input}
              type="number"
              value={keyForm.perMinuteQuota}
              onChange={(e) =>
                updateKeyField("perMinuteQuota", e.target.value)
              }
              placeholder="8"
            />
          </div>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={createKey}
              disabled={keysSaving}
            >
              {keysSaving ? "Saving…" : "Add API key"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminTradingConfig;
