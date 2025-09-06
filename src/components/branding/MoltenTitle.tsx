// src/components/branding/MoltenTitle.tsx
import React, { useRef } from 'react';
import styles from './MoltenTitle.module.css';
import { AsciiOoze } from './AsciiOoze';

/** Tweak these lines in code (no UI): */
const TITLE = {
  fontSize: 'clamp(72px, 10.5vw, 188px)', // overall size of “Medeni Jazbec”
  letterSpacing: '.05em',                  // space between letters
  wordSpacing: '.01em',                    // space between words
  depthStepPx: 3.0,                        // pseudo-3D thickness step (text-shadow offset per layer)
  oozeGapPx: -170,                         // vertical gap between title and molten ASCII
};

type Props = { text?: string; subline?: string };

const MoltenTitle: React.FC<Props> = ({ text = 'Medeni Jazbec', subline }) => {
  const h1Ref = useRef<HTMLHeadingElement | null>(null);

  // CSS custom properties are set here so you can tune the look in code:
  const styleVars: React.CSSProperties = {
    ['--mj-font-size' as any]: TITLE.fontSize,
    ['--mj-letter-spacing' as any]: TITLE.letterSpacing,
    ['--mj-word-spacing' as any]: TITLE.wordSpacing,
    ['--mj-depth-step' as any]: `${TITLE.depthStepPx}px`,
    ['--mj-ooze-gap' as any]: `${TITLE.oozeGapPx}px`,
  };

  return (
    <div className={styles.wrap} style={styleVars}>
      <h1 ref={h1Ref} className={styles.title}>{text}</h1>
      <AsciiOoze text={text} anchorRef={h1Ref} />
      {subline ? <div className={styles.sub}>{subline}</div> : null}
    </div>
  );
};

export default MoltenTitle;
