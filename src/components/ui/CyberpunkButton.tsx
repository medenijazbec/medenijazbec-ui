// src/components/ui/CyberpunkButton.tsx
import React from "react";

type CyberpunkButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  /** Optional small tag at bottom-right; hidden unless showTag is true. */
  tag?: string;
  showTag?: boolean;
  hue?: number;
  lightness?: number;
  fontSize?: number;
  glitchOnHover?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeToDims = {
  sm: { minWidth: 200, height: 56, labelSize: 8 },
  md: { minWidth: 280, height: 68, labelSize: 9 },
  lg: { minWidth: 320, height: 80, labelSize: 10 },
};

const CyberpunkButton: React.FC<CyberpunkButtonProps> = ({
  label,
  tag = "R25",
  showTag = false,          // default: hide tag (removes “CRT logo”)
  hue = 152,
  lightness = 50,
  fontSize = 26,
  glitchOnHover = true,
  size = "md",
  ...rest
}) => {
  const dims = sizeToDims[size];

  return (
    <>
      <button
        className={`cybr-btn ${glitchOnHover ? "hover-glitch" : "always-glitch"}`}
        {...rest}
      >
        {label}
        <span aria-hidden>_</span>
        <span aria-hidden className="cybr-btn__glitch">{label}_</span>
        {showTag ? <span aria-hidden className="cybr-btn__tag">{tag}</span> : null}
      </button>

      <style>{`
        .cybr-btn {
          --primary-hue: ${hue};
          --primary-lightness: ${lightness};
          --shadow-primary-hue: calc(var(--primary-hue) + 8);
          --shadow-secondary-hue: calc(var(--primary-hue) - 24);

          --primary: hsl(var(--primary-hue), 95%, calc(var(--primary-lightness) * 1%));
          --shadow-primary: hsl(var(--shadow-primary-hue), 85%, 45%);
          --shadow-secondary: hsl(var(--shadow-secondary-hue), 95%, 60%);
          --color: #061a14;
          --font-size: ${fontSize}px;
          --label-size: ${dims.labelSize}px;

          --border: 4px;
          --shimmy-distance: 5;
          --clip: polygon(0 0, 100% 0, 100% 100%, 95% 100%, 95% 90%, 85% 90%, 85% 100%, 8% 100%, 0 70%);
          --clip-one: polygon(0 2%, 100% 2%, 100% 95%, 95% 95%, 95% 90%, 85% 90%, 85% 95%, 8% 95%, 0 70%);
          --clip-two: polygon(0 78%, 100% 78%, 100% 100%, 95% 100%, 95% 90%, 85% 90%, 85% 100%, 8% 100%, 0 78%);
          --clip-three: polygon(0 44%, 100% 44%, 100% 54%, 95% 54%, 95% 54%, 85% 54%, 85% 54%, 8% 54%, 0 54%);
          --clip-four: polygon(0 0, 100% 0, 100% 0, 95% 0, 95% 0, 85% 0, 85% 0, 8% 0, 0 0);
          --clip-five: polygon(0 0, 100% 0, 100% 0, 95% 0, 95% 0, 85% 0, 85% 0, 8% 0, 0 0);
          --clip-six: polygon(0 40%, 100% 40%, 100% 85%, 95% 85%, 95% 85%, 85% 85%, 85% 85%, 8% 85%, 0 70%);
          --clip-seven: polygon(0 63%, 100% 63%, 100% 80%, 95% 80%, 95% 80%, 85% 80%, 85% 80%, 8% 80%, 0 70%);

          position: relative;
          display: inline-block;
          cursor: pointer;
          user-select: none;

          min-width: ${dims.minWidth}px;
          height: ${dims.height}px;
          line-height: ${dims.height}px;
          padding: 0 24px;

          border: 0;
          outline: transparent;

          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 700; /* was 800 – lighter per request */
          font-size: var(--font-size);
          font-family: 'Moliga', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          color: var(--color);
          background: transparent;
          transition: filter .2s ease, transform .02s ease;

          /* spacing between buttons (works even when wrapping) */
          margin: 6px 8px;
        }

        .cybr-btn:after,
        .cybr-btn:before {
          content: '';
          position: absolute;
          inset: 0;
          clip-path: var(--clip);
          z-index: -1;
          border-radius: 6px;
        }

        .cybr-btn:before {
          background: var(--shadow-primary);
          transform: translate(var(--border), 0);
          filter: drop-shadow(0 0 18px rgba(0, 255, 102, .2));
        }

        .cybr-btn:after {
          background: var(--primary);
          box-shadow:
            inset 0 0 0 1px rgba(0,255,102,.22),
            0 0 24px rgba(0,255,102,.20);
        }

        .cybr-btn:hover {
          filter: brightness(1.03) drop-shadow(0 0 14px rgba(0,255,102,.2));
        }
        .cybr-btn:active {
          transform: translateY(1px);
          filter: brightness(.98);
        }

        .cybr-btn__tag {
          position: absolute;
          padding: 1px 4px;
          letter-spacing: 1px;
          line-height: 1;
          bottom: -5%;
          right: 5%;
          font-weight: 600;
          color: #00170f;
          font-size: var(--label-size);
          background: rgba(0,255,102,.6);
          border-radius: 2px;
        }

        .cybr-btn__glitch {
          position: absolute;
          top: calc(var(--border) * -1);
          left: calc(var(--border) * -1);
          right: calc(var(--border) * -1);
          bottom: calc(var(--border) * -1);
          background: var(--shadow-primary);
          text-shadow:
            2px 2px var(--shadow-primary),
            -2px -2px var(--shadow-secondary);
          clip-path: var(--clip);
          animation: glitch 2s infinite;
          display: none;
          border-radius: 6px;
        }

        .hover-glitch:hover .cybr-btn__glitch { display: block; }
        .always-glitch .cybr-btn__glitch { display: block; }

        .cybr-btn__glitch:before {
          content: '';
          position: absolute;
          top: calc(var(--border) * 1);
          right: calc(var(--border) * 1);
          bottom: calc(var(--border) * 1);
          left: calc(var(--border) * 1);
          clip-path: var(--clip);
          background: var(--primary);
          z-index: -1;
          border-radius: 4px;
        }

        @keyframes glitch {
          0% { clip-path: var(--clip-one); }
          2%, 8% { clip-path: var(--clip-two); transform: translate(calc(var(--shimmy-distance) * -1%), 0); }
          6% { clip-path: var(--clip-two); transform: translate(calc(var(--shimmy-distance) * 1%), 0); }
          9% { clip-path: var(--clip-two); transform: translate(0, 0); }
          10% { clip-path: var(--clip-three); transform: translate(calc(var(--shimmy-distance) * 1%), 0); }
          13% { clip-path: var(--clip-three); transform: translate(0, 0); }
          14%, 21% { clip-path: var(--clip-four); transform: translate(calc(var(--shimmy-distance) * 1%), 0); }
          25% { clip-path: var(--clip-five); transform: translate(calc(var(--shimmy-distance) * 1%), 0); }
          30% { clip-path: var(--clip-five); transform: translate(calc(var(--shimmy-distance) * -1%), 0); }
          35%, 45% { clip-path: var(--clip-six); transform: translate(calc(var(--shimmy-distance) * -1%)); }
          40% { clip-path: var(--clip-six); transform: translate(calc(var(--shimmy-distance) * 1%)); }
          50% { clip-path: var(--clip-six); transform: translate(0, 0); }
          55% { clip-path: var(--clip-seven); transform: translate(calc(var(--shimmy-distance) * 1%), 0); }
          60% { clip-path: var(--clip-seven); transform: translate(0, 0); }
          31%, 61%, 100% { clip-path: var(--clip-four); }
        }
      `}</style>
    </>
  );
};

export default CyberpunkButton;
