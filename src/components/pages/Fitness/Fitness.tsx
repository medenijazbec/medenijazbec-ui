import React from 'react';
import Navbar from '@/components/navbar/Navbar';
import styles from './Fitness.module.css';
import ShealthHistoryModule from './ShealthHistoryModule';
import FooterMatrix from '@/components/Footer/FooterMatrix';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import FitnessFunFacts from './FitnessFunFacts';
import ShealthCaloriesMini from './ShealthCaloriesMini';

export default function FitnessPage() {
  return (
    <div className={`${styles.page} ${styles.pageWide}`}> {/* add pageWide to widen container */}
      <Navbar overlay brand="medenijazbec.pro" />

      {/* Glowing nebula field (visual-only) */}
      <div className={styles.nebulaField} aria-hidden="true">
        <span className={`${styles.nebula} ${styles.n1}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n2}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n3}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n4}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n5}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n6}`}><i className={styles.blob}/></span>
      </div>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.h1}>Fitness</h1>

{/* Lightweight intro text only */}
<div className={styles.card}>
  <div className={styles.muted} style={{ color: '#ffffffff', opacity: 1 }}>
    Interactive Samsung Health step history with hover zoom—showing monthly totals, daily breakdowns, and top days for steps and distance.
    <b style={{ color: 'var(--phosphor, #00ff66)' }}> Note:</b> base figures reflect step data only; I add a gym-energy estimate on top.

    {/* Collapsible list */}
    <details className={styles.expander}>
      <summary className={styles.expanderSummary}>
        <span className={styles.chev} aria-hidden>▸</span>
        Gym energy model (assumptions behind the estimate)
      </summary>

      <div className={styles.expanderBody}>
        <ul className={styles.expanderList}>
          <li>
            <b style={{ color: 'var(--phosphor, #00ff66)' }}>Profile:</b> 88&nbsp;kg, 183&nbsp;cm
          </li>
          <li>
            <b style={{ color: 'var(--phosphor, #00ff66)' }}>Schedule:</b> 5 days/week, avg session 75&nbsp;min —
            Mon chest, Tue back, Wed legs (strength-focused), Thu shoulders, Fri arms
          </li>
          <li>
            <b style={{ color: 'var(--phosphor, #00ff66)' }}>METs:</b> upper-body hypertrophy ≈ 3.5&nbsp;MET; legs strength ≈ 5.0&nbsp;MET
            (can reach ~6.0&nbsp;MET cuz i got that dog in me)
          </li>
          <li>
            <b style={{ color: 'var(--phosphor, #00ff66)' }}>Per-session kcal (88&nbsp;kg, 75&nbsp;min):</b>
            upper ≈ 404&nbsp;kcal; legs ≈ 578&nbsp;kcal (≈ 693&nbsp;kcal vigorous)
          </li>
          <li>
            <b style={{ color: 'var(--phosphor, #00ff66)' }}>Weekly add-on used in charts:</b>
            4×upper + 1×legs ≈ <b style={{ color: 'var(--phosphor, #00ff66)' }}>2,195&nbsp;kcal/week</b>
            (or <b style={{ color: 'var(--phosphor, #00ff66)' }}>2,310&nbsp;kcal/week</b> if legs are very vigorous)
          </li>
        </ul>
      </div>
    </details>
  </div>
</div>


          {/* 3D RENDRING <ShealthIso3D metric="steps" /> */}
          
          {/* All logic & rendering lives in the module */}
          <ShealthHistoryModule />
<div style={{ marginTop: 18 }}></div>
{/* Slim, full-width monthly calories chart */}
<ShealthCaloriesMini />
<div style={{ marginTop: 18 }}></div>
<FitnessFunFacts />

          <div className={styles.muted}>
  <div style={{ marginBottom: 8, marginTop: 16 }}>
    
    Below is the mathematical formula I used to convert steps to distance (km).
    Samsung Health provides both steps and I couldn't be fucked to find distance for them all, therefore,
    to visualize distance consistently, I derived a logistic step-length formula fitted to my known data points.
  </div>

  {/* Steps → km formula (logistic step-length) */}
  <div style={{ marginTop: 8 }}>
    <strong>The formula (distance in km from steps)</strong>

    <BlockMath math={
      String.raw`\text{step\_length}_{\text{m}}(s) \;=\; L_{\min} \;+\; \frac{L_{\max}-L_{\min}}{1+\exp\!\left(-\frac{s-s_0}{k}\right)}`
    } />

    <BlockMath math={
      String.raw`\text{distance}_{\text{km}}(s) \;=\; \frac{s \cdot \text{step\_length}_{\text{m}}(s)}{1000}`
    } />

    <div style={{ marginTop: 8 }}>
      Fitting this to my Samsung pairs (just random days with known distance)
      <code> (4474, 3.24), (4964, 3.72), (1247, 0.90), (6310, 4.78), (7933, 6.37)</code>
      {" "}yields parameters that are both realistic for my height (183&nbsp;cm) <em>and</em> accurate:
    </div>

    <ul style={{ margin: '6px 0 0 18px' }}>
      <li>
        <InlineMath math={String.raw`L_{\min}=0.71\ \text{m}`} /> — conservative walking step length
      </li>
      <li>
        <InlineMath math={String.raw`L_{\max}=0.85\ \text{m}`} /> — longer stride on high-activity days
      </li>
      <li>
        <InlineMath math={String.raw`s_0=7000`} /> — center of the transition
      </li>
      <li>
        <InlineMath math={String.raw`k=1500`} /> — transition steepness
      </li>
    </ul>

    <div style={{ marginTop: 6 }}>
      This configuration gives <b>~35&nbsp;m RMSE</b> on my sample days.
      <br></br>RMSE ~ root mean square error. It’s a size-of-error measure for regression. Units match the target (here: meters), so 35 m RMSE means my typical miss is about 35 meters. Which on a 3km - 6km day, RMSE is about 0.6% - 1.2%.
    </div>
  </div>
</div>

        </div>



        
      </main>
      <FooterMatrix overlay={false} />
    </div>
  );
}
