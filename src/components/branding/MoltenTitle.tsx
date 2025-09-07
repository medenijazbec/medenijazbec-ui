import React from 'react';
import styles from './MoltenTitle.module.css';

/** Tweak these lines in code (no UI): */
const TITLE = {
  fontSize: 'clamp(72px, 10.5vw, 188px)', // overall size of “Medeni Jazbec”
  letterSpacing: '.05em',                  // space between letters
  wordSpacing: '.01em',                    // space between words
  depthStepPx: 3.0,                        // pseudo-3D thickness step (text-shadow offset per layer)
};

type Props = { text?: string; subline?: string };

const MoltenTitle: React.FC<Props> = ({ text = 'Medeni Jazbec', subline }) => {
  const styleVars: React.CSSProperties = {
    ['--mj-font-size' as any]: TITLE.fontSize,
    ['--mj-letter-spacing' as any]: TITLE.letterSpacing,
    ['--mj-word-spacing' as any]: TITLE.wordSpacing,
    ['--mj-depth-step' as any]: `${TITLE.depthStepPx}px`,
  };

  return (
    <div className={styles.wrap} style={styleVars}>
      <h1 className={styles.title}>{text}</h1>
      {subline ? <div className={styles.sub}>{subline}</div> : null}
    </div>
  );
};

export default MoltenTitle;
