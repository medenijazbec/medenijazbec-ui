import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import sunPng from "@/assets/sun.png";
import moonPng from "@/assets/moon.png";
import githubPng from "@/assets/github.png";
import AdminStatus from "@/components/admin/AdminStatus/AdminStatus";
import { useAuth } from "../auth/AuthContext";

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
  /** When true, the nav overlays content (no spacer). */
  overlay?: boolean;
};

const Navbar: React.FC<Props> = ({ brand = "medenijazbec.pro", onNavigate, overlay = true }) => {
  const { isAdmin } = useAuth();

  const [active, setActive] = useState<"fitness"|"projects"|"about">("fitness");
  const [dark, setDark] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [color, setColor] = useState<ColorKey>("green");

  const { pathname } = useLocation();
  const navigate = useNavigate();

  // ===== Theme color hookup =====
  useEffect(() => {
    const { phosphor, outline } = COLOR_THEME[color];
    const root = document.documentElement;
    root.style.setProperty("--phosphor", phosphor);
    root.style.setProperty("--outline-dark", outline);
  }, [color]);

  // ===== Light/Dark =====
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ===== Close palette on outside click =====
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

  // ===== Nav buttons (Fitness/Projects/About) =====
  const onClickNav = (key: "fitness"|"projects"|"about") => {
    setActive(key);
    onNavigate?.(key);
  };

  const colorDotStyle = useMemo<React.CSSProperties>(() => ({
    background: COLOR_THEME[color].phosphor
  }), [color]);

  // ===== Hidden brand tap-to-unlock (/vs) =====
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

  return (
    <>
      {!overlay && <div className={styles.bodyOffset} />}

      <nav className={styles.nav} aria-label="Top">
        <div className={styles.inner}>
          {/* Brand: Link visually, handled via onClick for stealth behavior */}
          <Link
            to="/"
            className={styles.brand}
            onClick={onBrandClick}
            aria-label={brand}
          >
            <span className={styles.brandIcon} aria-hidden="true" />
            {brand}
          </Link>

          {/* center slot */}
          <div className={styles.center}>
            <AdminStatus />
          </div>

          <div className={styles.right}>
            <div className={styles.links}>
              {/* Explicit Home link */}
              <Link className={styles.btn} to="/">Home</Link>

              <Link
                className={`${styles.btn} ${pathname.startsWith("/fitness") ? styles.active : ""}`}
                to="/fitness"
              >
                Fitness
              </Link>
              <button
                className={`${styles.btn} ${active==="projects" ? styles.active : ""}`}
                onClick={() => onClickNav("projects")}
              >
                Projects
              </button>
              <button
                className={`${styles.btn} ${active==="about" ? styles.active : ""}`}
                onClick={() => onClickNav("about")}
              >
                About
              </button>

              {/* ===== Admin links (only for admins) ===== */}
              {isAdmin && (
                <>
                  <Link
                    className={`${styles.btn} ${pathname.startsWith("/admin/showcase") ? styles.active : ""}`}
                    to="/admin/showcase"
                  >
                    Manage Showcase
                  </Link>
                  <Link
                    className={`${styles.btn} ${pathname.startsWith("/admin/projects") ? styles.active : ""}`}
                    to="/admin/projects"
                  >
                    Manage Projects
                  </Link>
                  <Link
                    className={`${styles.btn} ${pathname.startsWith("/admin/animgroups") ? styles.active : ""}`}
                    to="/admin/animgroups"
                  >
                    Manage Anim Groups
                  </Link>
                  <Link
                    className={`${styles.btn} ${pathname.startsWith("/admin/fitness") ? styles.active : ""}`}
                    to="/admin/fitness"
                  >
                    Manage Fitness
                  </Link>
                </>
              )}
            </div>

            <div className={styles.tools}>
              <button
                className={styles.iconBtn}
                aria-label="Toggle theme"
                onClick={() => setDark(v => !v)}
                title={dark ? "Switch to light" : "Switch to dark"}
              >
                <span className={styles.iconSwap}>
                  <img src={sunPng}  alt="" className={`${styles.icon} ${!dark ? styles.visible : ""}`} />
                  <img src={moonPng} alt="" className={`${styles.icon} ${ dark ? styles.visible : ""}`} />
                </span>
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
