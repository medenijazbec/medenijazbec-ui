import React, { useEffect, useMemo, useState } from "react";
import styles from "./Navbar.module.css";
import sunPng from "@/assets/sun.png";
import moonPng from "@/assets/moon.png";
import githubPng from "@/assets/github.png";

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
  const [active, setActive] = useState<"fitness"|"projects"|"about">("fitness");
  const [dark, setDark] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [color, setColor] = useState<ColorKey>("green");

  useEffect(() => {
    const { phosphor, outline } = COLOR_THEME[color];
    const root = document.documentElement;
    root.style.setProperty("--phosphor", phosphor);
    root.style.setProperty("--outline-dark", outline);
  }, [color]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

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

  return (
    <>
      {/* Only render the spacer when NOT overlaying */}
      {!overlay && <div className={styles.bodyOffset} />}

      <nav className={styles.nav} aria-label="Top">
        <div className={styles.inner}>
          <a className={styles.brand} href="#">
            <span className={styles.brandIcon} aria-hidden="true" />
            {brand}
          </a>

          <div className={styles.right}>
            <div className={styles.links}>
              <button
                className={`${styles.btn} ${active==="fitness" ? styles.active : ""}`}
                onClick={() => onClickNav("fitness")}
              >Fitness</button>
              <button
                className={`${styles.btn} ${active==="projects" ? styles.active : ""}`}
                onClick={() => onClickNav("projects")}
              >Projects</button>
              <button
                className={`${styles.btn} ${active==="about" ? styles.active : ""}`}
                onClick={() => onClickNav("about")}
              >About</button>
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
