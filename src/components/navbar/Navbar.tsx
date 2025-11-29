/** === FLASHBANG CONFIG — tweak freely === */
const FLASH_CFG = {
  audioSrc: "/sound/thinkfast.mp3", // /public/sound/thinkfast.mp3
  images: {
    f1: "/flashbang_icons/flashbang1.png",
    f2: "/flashbang_icons/flashbang2.png",
  },
  warnDurationMs: 2000, // toast lifetime
  delays: {
    f1: 1200,            // +1.166s -> flashbang1.png
    f2: 1766,            // +1.766s -> flashbang2.png
    white: 1900,         // +1.900s -> full-screen whiteout
    holdWhiteMs: 3000,   // keep whiteout for 3.000s
    fadeDurationMs: 900
  },
  imageFadeAfterMs: 450 // each flash image fades 1s after it appears
} as const;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

// Resolve PNGs relative to THIS file (same pattern as GitHub)
const sunPng  = new URL("../../assets/sun.png", import.meta.url).href;
const moonPng = new URL("../../assets/moon.png", import.meta.url).href;
const githubPng = new URL("../../assets/github.png", import.meta.url).href;

import AdminStatus from "@/components/admin/AdminStatus/AdminStatus";
import { useAuth } from "../auth/AuthContext";

/** === FLASHBANG CONFIG — tweak freely === */
const COLOR_THEME = {
  green:  { phosphor:"#00ff66", outline:"#0e3b2c" },
  red:    { phosphor:"#ff4d4d", outline:"#4b1111" },
  blue:   { phosphor:"#3b82f6", outline:"#0e244b" },
  lblue:  { phosphor:"#60a5fa", outline:"#123a6b" },
};
type ColorKey = keyof typeof COLOR_THEME;

type Props = {
  brand?: string;
  onNavigate?: (to: "fitness" | "projects" | "about") => void;
  overlay?: boolean;
};

const Navbar: React.FC<Props> = ({ brand = "medenijazbec.pro", onNavigate, overlay = true }) => {
  const { isAdmin } = useAuth();

  const [active, setActive] = useState<"fitness"|"projects"|"about">("fitness");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [color, setColor] = useState<ColorKey>("green");

  const { pathname, hash } = useLocation();
  const aboutActive = pathname.startsWith("/about") || (pathname === "/" && hash === "#about");

  const navigate = useNavigate();

  // Theme color hookup
  useEffect(() => {
    const { phosphor, outline } = COLOR_THEME[color];
    const root = document.documentElement;
    root.style.setProperty("--phosphor", phosphor);
    root.style.setProperty("--outline-dark", outline);
  }, [color]);

  // Close palette on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.(`.${styles.palette}`) && !target.closest?.(`.${styles.colorDot}`)) {
        setPaletteOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onClickNav = (key: "fitness"|"projects"|"about") => {
    setActive(key);
    onNavigate?.(key);
  };

  const colorDotStyle = useMemo<React.CSSProperties>(() => ({
    background: COLOR_THEME[color].phosphor
  }), [color]);

  // Hidden brand tap-to-unlock (/vs)
  const [tapCount, setTapCount] = useState(0);
  const resetTimerRef = useRef<number | null>(null);

  const resetCounterSoon = () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setTapCount(0);
      resetTimerRef.current = null;
    }, 2500);
  };

  const onBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (pathname !== "/") {
      navigate("/", { replace: false });
      return;
    }

    setTapCount((c) => {
      const next = c + 1;
      if (next >= 10) {
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
        setTimeout(() => setTapCount(0), 0);
        navigate("/vs", { replace: true });
        return 0;
      }
      resetCounterSoon();
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  // ====== FLASHBANG SEQUENCE ======
  const [clicks, setClicks] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [flashStage, setFlashStage] = useState<"idle"|"f1"|"f2"|"white"|"fading">("idle");
  const [flashVisible, setFlashVisible] = useState(false);

  // NEW: track each image’s visibility so we can auto-fade each one after 1s
  const [f1On, setF1On] = useState(false);
  const [f2On, setF2On] = useState(false);

  const timeouts = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearFlashTimers = () => {
    timeouts.current.forEach(id => window.clearTimeout(id));
    timeouts.current = [];
  };

  const endFlash = () => {
    setFlashStage("fading");
    const id = window.setTimeout(() => {
      setFlashVisible(false);
      setFlashStage("idle");
      setClicks(0);
      setF1On(false);
      setF2On(false);
    }, FLASH_CFG.delays.fadeDurationMs);
    timeouts.current.push(id);
  };

  const onFlashButton = () => {
    const next = clicks + 1;
    setClicks(next);

    if (next === 1) {
      setWarning("Don't click this button again");
      window.setTimeout(() => setWarning(null), FLASH_CFG.warnDurationMs);
      return;
    }
    if (next === 2) {
      setWarning("You really clicked it huh?");
      window.setTimeout(() => setWarning(null), FLASH_CFG.warnDurationMs);
      return;
    }

    // 3rd click => begin sequence
    setWarning(null);

    if (!audioRef.current) {
      audioRef.current = new Audio(FLASH_CFG.audioSrc);
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioRef.current.play().catch(() => {});

    // Reset visibility for this run
    setF1On(false);
    setF2On(false);

    setFlashVisible(true);
    setFlashStage("idle");

    // f1 appears at t = delays.f1, then fades 1s later
    timeouts.current.push(window.setTimeout(() => {
      setFlashStage("f1");
      setF1On(true);
      // schedule fade-out of f1
      timeouts.current.push(window.setTimeout(() => setF1On(false), FLASH_CFG.imageFadeAfterMs));
    }, FLASH_CFG.delays.f1));

    // f2 appears at t = delays.f2, then fades 1s later
    timeouts.current.push(window.setTimeout(() => {
      setFlashStage("f2");
      setF2On(true);
      // schedule fade-out of f2
      timeouts.current.push(window.setTimeout(() => setF2On(false), FLASH_CFG.imageFadeAfterMs));
    }, FLASH_CFG.delays.f2));

    // whiteout
    timeouts.current.push(window.setTimeout(() => setFlashStage("white"), FLASH_CFG.delays.white));

    // fade overlay after whiteout hold
    timeouts.current.push(
      window.setTimeout(() => endFlash(), FLASH_CFG.delays.white + FLASH_CFG.delays.holdWhiteMs)
    );
  };

  useEffect(() => () => clearFlashTimers(), []);

  // Visible toast for warnings
  const toast = warning ? (
    <div
      style={{
        position: "fixed",
        top: "calc(var(--nav-height, 3rem) + 8px)",
        right: "12px",
        zIndex: 10001,
        background: "rgba(10,10,10,.92)",
        border: "1px solid rgba(255,255,255,.15)",
        padding: "10px 12px",
        borderRadius: 10,
        fontSize: "0.95rem",
        color: "#f3f3f3",
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        pointerEvents: "none"
      }}
      role="status"
      aria-live="assertive"
    >
      {warning}
    </div>
  ) : null;

  return (
    <>
      {!overlay && <div className={styles.bodyOffset} />}

      {/* FLASHBANG OVERLAY */}
      {flashVisible && (
        <div
          className={[
            styles.flashOverlay,
            flashStage === "white" ? styles.whiteout : "",
            flashStage === "fading" ? styles.fade : "",
            styles.flashVisible
          ].join(" ")}
          aria-hidden="true"
        >
          {/* Each image now shows when its own boolean is true; removing .show fades it */}
          <img
            src={FLASH_CFG.images.f1}
            alt=""
            className={`${styles.flashImg} ${f1On ? styles.show : ""}`}
          />
          <img
            src={FLASH_CFG.images.f2}
            alt=""
            className={`${styles.flashImg} ${f2On ? styles.show : ""}`}
          />
        </div>
      )}

      {toast}

      <nav className={styles.nav} aria-label="Top">
        <div className={styles.inner}>
          <Link
            to="/"
            className={styles.brand}
            onClick={onBrandClick}
            aria-label={brand}
          >
            <span className={styles.brandIcon} aria-hidden="true" />
            {brand}
          </Link>

          <div className={styles.center}>
            <AdminStatus />
          </div>

          <div className={styles.right}>
            <div className={styles.links}>
              <Link className={styles.btn} to="/">Home</Link>
              <Link className={`${styles.btn} ${pathname.startsWith("/fitness") ? styles.active : ""}`} to="/fitness">Fitness</Link>
              <Link className={`${styles.btn} ${pathname.startsWith("/projects") ? styles.active : ""}`} to="/projects">Projects</Link>
              <Link className={`${styles.btn} ${aboutActive ? styles.active : ""}`} to="/about">About</Link>
              <Link className={`${styles.btn} ${pathname.startsWith("/live-trading") ? styles.active : ""}`} to="/live-trading">Live Trading</Link>

              {isAdmin && (
                <>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/market") ? styles.active : ""}`} to="/admin/market">Market</Link>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/candle-trading") ? styles.active : ""}`} to="/admin/candle-trading">Candle trading</Link>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/showcase") ? styles.active : ""}`} to="/admin/showcase">Admin Stats</Link>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/projects") ? styles.active : ""}`} to="/admin/projects">Manage Projects</Link>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/animgroups") ? styles.active : ""}`} to="/admin/animgroups">Manage Anim Groups</Link>
                  <Link className={`${styles.btn} ${pathname.startsWith("/admin/fitness") ? styles.active : ""}`} to="/admin/fitness">Manage Fitness</Link>
                </>
              )}
            </div>

            <div className={styles.tools}>
              {/* THIS BUTTON NOW TRIGGERS THE FLASHBANG (icon loaded like GitHub) */}
              <button
                className={styles.iconBtn}
                aria-label="Do not press"
                onClick={onFlashButton}
                title="Do not press"
              >
                {/* fixed sun icon */}
                <img src={sunPng} alt="Theme icon" className={styles.gh} />
              </button>

              <span
                className={styles.colorDot}
                style={colorDotStyle}
                title="Theme color"
                onClick={(e) => { e.stopPropagation(); setPaletteOpen(o => !o); }}
              />
              {paletteOpen && (
                <div className={styles.paletteWrap}>
                  <div className={styles.palette} role="menu" aria-label="Pick color">
                    <span className={styles.swatch} style={{background:COLOR_THEME.green.phosphor}} onClick={() => setColor("green")} />
                    <span className={styles.swatch} style={{background:COLOR_THEME.red.phosphor}}   onClick={() => setColor("red")} />
                    <span className={styles.swatch} style={{background:COLOR_THEME.blue.phosphor}}  onClick={() => setColor("blue")} />
                    <span className={styles.swatch} style={{background:COLOR_THEME.lblue.phosphor}} onClick={() => setColor("lblue")} />
                  </div>
                </div>
              )}

              <a
                className={styles.gh}
                href="https://github.com/medenijazbec"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
              >
                <img src={githubPng} alt="GitHub" className={styles.gh} />
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
