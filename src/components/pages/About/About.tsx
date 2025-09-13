import React, { useEffect, useRef, useState } from "react";
import styles from "./about.module.css";
import Navbar from "@/components/navbar/Navbar"; // adjust if your path differs
import FooterMatrix from "@/components/Footer/FooterMatrix";

type SkillCard = {
  title: string;
  blurb: string;
  skills: string[];
};

type ProjectCard = {
  title: string;
  blurb: string;
  img: string; // path in /public
};

const ICONS: Record<string, string> = {
  // Core web
  HTML: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
  CSS: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
  JavaScript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
  TypeScript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
  React: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
  Vite: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg",

  // .NET / backend
  "ASP.NET Core": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
  "ASP.NET Web APIs": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
  "ASP.NET Identity": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
  "C# Windows Forms": "https://cdn.simpleicons.org/windows",
  ".NET MAUI": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
  ".NET WPF": "https://cdn.simpleicons.org/windows",
  ".NET WCF": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
  Blazor: "https://cdn.simpleicons.org/blazor",
  gRPC: "https://grpc.io/img/logos/grpc-logo.svg",
  REST: "https://cdn.simpleicons.org/swagger",
  "RESTful services": "https://cdn.simpleicons.org/swagger",
  "OAuth 2.0": "https://cdn.simpleicons.org/openid",

  // Languages & DB
  "C#": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
  "C++": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
  Python: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
  PHP: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
  MySQL: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
  MySQLi: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
  PostgreSQL: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",

  // DevOps / tools
  Git: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
  Docker: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
  "Portainer.io": "https://cdn.simpleicons.org/portainer",
  "TrueNAS SCALE": "https://cdn.simpleicons.org/truenas",
  "TrueNAS CORE": "https://cdn.simpleicons.org/truenas",

  // Design / media
  Photoshop: "https://img.icons8.com/color/96/adobe-photoshop--v1.png",
  "Sony Vegas Pro": "https://img.icons8.com/color/96/sony-vegas.png",

  // OS & IDEs
  Linux: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg",
  "Fedora Linux": "https://cdn.simpleicons.org/fedora",
  Ubuntu: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-plain.svg",
  "Ubuntu Linux": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-plain.svg",
  "Visual Studio": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/visualstudio/visualstudio-plain.svg",
  "Visual Studio Code": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg",
  "IntelliJ IDEA": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/intellij/intellij-original.svg",
  Eclipse: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/eclipse/eclipse-original.svg",
  Vim: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vim/vim-original.svg",

// AI/ML
PyTorch: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg",
Transformers: "https://cdn.simpleicons.org/huggingface",
Accelerate: "https://cdn.simpleicons.org/huggingface",
PEFT: "https://raw.githubusercontent.com/huggingface/peft/main/docs/source/_static/img/peft-logo.png",
TRL: "https://raw.githubusercontent.com/huggingface/trl/main/docs/source/_static/trl-logo.png",
"bitsandbytes": "https://avatars.githubusercontent.com/u/128001430?s=200&v=4",
"xFormers": "https://avatars.githubusercontent.com/u/125161118?s=200&v=4",
"Ollama": "https://cdn.simpleicons.org/ollama",
"llama.cpp": "https://avatars.githubusercontent.com/u/150070558?s=200&v=4",
"vLLM": "https://avatars.githubusercontent.com/u/139503744?s=200&v=4",
"ONNX Runtime": "https://cdn.simpleicons.org/onnx",
OpenVINO: "https://avatars.githubusercontent.com/u/3275357?s=200&v=4",
TensorRT: "https://avatars.githubusercontent.com/u/1728152?s=200&v=4",
"scikit-learn": "https://cdn.simpleicons.org/scikitlearn",
NumPy: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg",
Pandas: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg",
JAX: "https://avatars.githubusercontent.com/u/54307078?s=200&v=4",
TensorFlow: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg",
Faiss: "https://raw.githubusercontent.com/facebookresearch/faiss/main/resources/faiss-logo.svg",
Qdrant: "https://cdn.simpleicons.org/qdrant",
ChromaDB: "https://avatars.githubusercontent.com/u/122499872?s=200&v=4",
LangChain: "https://cdn.simpleicons.org/langchain",
LlamaIndex: "https://avatars.githubusercontent.com/u/123537751?s=200&v=4",
SentenceTransformers: "https://avatars.githubusercontent.com/u/53638616?s=200&v=4",
spaCy: "https://cdn.simpleicons.org/spacy",
NLTK: "https://avatars.githubusercontent.com/u/1260380?s=200&v=4",
OpenCV: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg",
torchvision: "https://pytorch.org/assets/images/pytorch-logo.png",
torchaudio: "https://pytorch.org/assets/images/pytorch-logo.png",
Gradio: "https://cdn.simpleicons.org/gradio",
FastAPI: "https://cdn.simpleicons.org/fastapi",
Ray: "https://avatars.githubusercontent.com/u/5407916?s=200&v=4",
Dask: "https://cdn.simpleicons.org/dask",
Optuna: "https://cdn.simpleicons.org/optuna",
"Weights & Biases": "https://cdn.simpleicons.org/weightsandbiases",
MLflow: "https://cdn.simpleicons.org/mlflow",
Unsloth: "https://avatars.githubusercontent.com/u/170044110?s=200&v=4",


};

const skillCards: SkillCard[] = [
  {
    title: "Frontend Development",
    blurb:
      "Building fast, accessible UIs with modern tooling. Clean components, predictable state, crisp motion.",
    skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Vite"],
  },
  {
    title: "Backend Development",
    blurb:
      "Designing secure, scalable APIs and services. Focus on reliability, auth, and clear service boundaries.",
    skills: [
      "ASP.NET Core",
      "ASP.NET Web APIs",
      "gRPC",
      "REST",
      "OAuth 2.0",
      "C#",
      "MySQL",
      "PostgreSQL",
    ],
  },
  {
    title: "Programming & Web Development",
    blurb:
      "Languages and core technologies I use for software and web development.",
    skills: ["C#", "C++", "CSS", "JavaScript", "HTML", "Python", "PHP"],
  },
  {
    title: ".NET Ecosystem & App Development",
    blurb:
      "From desktop to modern web and mobile within the .NET ecosystem.",
    skills: [
      "ASP.NET Core",
      "ASP.NET Identity",
      "ASP.NET Web APIs",
      "C# Windows Forms",
      ".NET MAUI",
      ".NET WPF",
      ".NET WCF",
      "Blazor",
    ],
  },
  {
    title: "Databases & Data Management",
    blurb:
      "Relational DBs, schema design, integrations, and query optimization.",
    skills: ["MySQL", "MySQLi", "PostgreSQL"],
  },
  {
    title: "DevOps, Orchestration & Integration",
    blurb:
      "Versioning, containerization, orchestration, and dependable deployments.",
    skills: [
      "Git",
      "Docker",
      "Portainer.io",
      "TrueNAS SCALE",
      "RESTful services",
      "gRPC",
      "OAuth 2.0",
    ],
  },
  {
    title: "Design, Multimedia & Editing",
    blurb:
      "Basic design and media editing for assets, presentations, and content.",
    skills: ["Photoshop", "Sony Vegas Pro"],
  },
  {
    title: "Operating Systems & Development Environments",
    blurb:
      "Daily platforms and environments for development, testing, and ops.",
    skills: [
      "TrueNAS CORE",
      "Linux",
      "Fedora Linux",
      "Ubuntu",
      "Visual Studio",
      "Visual Studio Code",
      "IntelliJ IDEA",
      "Eclipse",
      "Vim",
    ],
  },
  {
  title: "AI & Machine Learning",
  blurb:
    "Training, fine-tuning and serving modern LLMs and CV models. Emphasis on efficient fine-tuning (LoRA/PEFT), quantization, GPU utilization and reliable APIs.",
  skills: [
    // you asked for these specifically:
    "Unsloth", "bitsandbytes", "PyTorch", "llama.cpp", "Ollama",

    // solid Python/serving stack:
    "Transformers", "Accelerate",
    "NumPy", "Pandas", "scikit-learn", "TensorFlow",

    // I/O, dashboards, APIs, scaling, opt:
    "torchvision", "FastAPI",
    
  ],
},

];

const projects: ProjectCard[] = [
  {
    title: "“Poor Man’s” Supercomputer",
    blurb:
      "8× GPUs @ 24 GB VRAM each (≈192 GB total) for high-throughput AI inference. Focus on parallelism, queuing, batching, and cost-effective scaling.",
    img: "/supercomputer.png",
  },
  {
    title: "Quad-Vision: Digital Night-Vision + Thermal Hybrid",
    blurb:
      "Synchronized digital night-vision with thermal overlay. Goal: low-latency fusion, calibration, and robust recording.",
    img: "/nightvisionquads.png",
  },
  {
    title: "Hypertrophy Metrics (Expansion)",
    blurb:
      ".NET MAUI app + custom API for planning/logging training: mesocycles, sessions, exercises, sets, reps, load, and RIR. Live charts on the Fitness page.",
    img: "/hypertrophymetrics.png",
  },
  {
    title: "ADE — Autonomous Development Environment",
    blurb:
      "My own ChatGPT-style UI (not an OpenUI fork) with React + TypeScript and a .NET backend. Agent collaboration in containers/VMs with an emphasis on AI parallelism.",
    img: "/ade.png",
  },
  {
    title: "Samsung Health Data Puller & Charts",
    blurb:
      "Service to pull Samsung Health data and render reliable charts/dashboards. Feeds my Fitness page with personal metrics.",
    img: "/samsungdata.png",
  },
];

const About: React.FC = () => {
  // ===== Tilt on hover =====
  const handleMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y - r.height / 2) / r.height) * -6;
    const ry = ((x - r.width / 2) / r.width) * 6;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  };
  const resetMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  // ===== Horizontal rail logic =====
  const railRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(true);
  const [canRight, setCanRight] = useState(true);

  const updateCanNav = () => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    const x = rail.scrollLeft;
    setCanLeft(x > 4);
    setCanRight(x < max - 4);
  };

  // Center the second card on mount
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const tiles = Array.from(
      rail.querySelectorAll(`.${styles.tile}`)
    ) as HTMLElement[];
    if (!tiles.length) return;
    const idx = tiles.length >= 2 ? 1 : 0; // center the 2nd by default
    const el = tiles[idx];
    const target = el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, target), behavior: "auto" });
    updateCanNav();

    const onScroll = () => updateCanNav();
    const onResize = () => {
      // keep the 2nd centered on resize
      const t = el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2;
      rail.scrollTo({ left: Math.max(0, t), behavior: "auto" });
      updateCanNav();
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click arrows => scroll by one tile (width + gap)
  const scrollByTile = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const tile = rail.querySelector<HTMLElement>(`.${styles.tile}`);
    const style = getComputedStyle(rail);
    const gap =
      parseFloat(style.getPropertyValue("gap") || style.getPropertyValue("column-gap")) || 16;
    const w = (tile?.clientWidth ?? rail.clientWidth * 0.5) + gap;
    rail.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  // Wheel => horizontal scroll when hovering the carousel
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const rail = railRef.current;
    if (!rail) return;
    // Prevent page scroll; convert vertical to horizontal
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    rail.scrollLeft += delta;
  };

  const urlFor = (name: string) =>
    ICONS[name] ?? "https://cdn.simpleicons.org/circle";

  return (
    <>
      <Navbar overlay={false} brand="medenijazbec.pro" />

      <section className={styles.about}>
        {/* Intro */}
<header className={styles.intro}>
  <p className={styles.kicker}>About</p>
  <h1 className={styles.title}>
    I'm <span className={styles.accent}>Medeni Jazbec</span>.
  </h1>
  <p className={styles.lead}>
    I’m <strong>22</strong>. I started going to the gym in <strong>2021</strong> and it’s
    still the best decision I’ve ever made. Below are some of my hobbies and interests.
  </p>

  <ul className={styles.hobbyGrid}>
    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Gym</b></span>
      </div>
      <p className={styles.hobbyBody}>
        strength + hypertrophy, progress tracking, stats.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Software</b></span>
      </div>
      <p className={styles.hobbyBody}>
        TypeScript, React, .NET, Docker, automation, locally run AI, agents.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Hardware</b></span>
      </div>
      <p className={styles.hobbyBody}>
        custom PCs, server builds, inference servers, rigs & boards.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Drone Tech</b></span>
      </div>
      <p className={styles.hobbyBody}>
        FPV, aerial capture, tuning, telemetry pipelines. Still larping here too.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Photography</b></span>
      </div>
      <p className={styles.hobbyBody}>
        landscapes, astrophotography, post-processing.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Video editing</b></span>
      </div>
      <p className={styles.hobbyBody}>
        random stuff for fun, making friends laugh, etc.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Night vision & thermal</b></span>
      </div>
      <p className={styles.hobbyBody}>
        planning a quad monocular NV rig with thermal overlay; custom software to spot environmental patterns.
      </p>
    </li>

    <li className={styles.hobbyCard} tabIndex={0}>
      <div className={styles.hobbyHeader}>
        <span className={styles.dot} />
        <span className={styles.accent}><b>Firearms</b></span>
      </div>
      <p className={styles.hobbyBody}>
        strong interest, but at the moment still just larping.
      </p>
    </li>
  </ul>
</header>


        {/* Skillset */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Need more info? <span className={styles.accent}>I got you.</span>
          </h2>
          <p className={styles.sectionSub}>
            Here are some of the core services I've come in contact with. Each card includes a short
            description and the tools/technologies I actively use.
          </p>

          <div className={styles.grid}>
            {skillCards.map((card) => (
              <article key={card.title} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                </div>
                <p className={styles.cardBlurb}>{card.blurb}</p>
                <ul className={styles.skillList}>
                  {card.skills.map((s) => (
                    <li key={s}>
                      <a
                        href={urlFor(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.skillChip}
                        title={s}
                      >
                        <img src={urlFor(s)} alt="" className={styles.skillIcon} />
                        {s}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
              
            ))}
            
          </div>
        </section>

        {/* Projects now — horizontal scroller with arrows & wheel control */}
        <section className={styles.section}>
          <div className={styles.projectsHeader}>
            <p className={styles.kicker}>Projects</p>
            <h2 className={styles.sectionTitle}>Ongoing projects that I'm currently working on.</h2>
            <p className={styles.sectionSub}>
              Things I’m currently working on — hover to peek. 
            </p>
          </div>

          <div className={styles.carousel} onWheel={onWheel}>
            {/* Nav arrows */}
            <button
              type="button"
              aria-label="Previous"
              className={`${styles.navBtn} ${styles.left}`}
              onClick={() => scrollByTile(-1)}
              disabled={!canLeft}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className={styles.projectRail} ref={railRef}>
              {projects.map((p) => (
                <div
                  key={p.title}
                  className={styles.tile}
                  onMouseMove={handleMove}
                  onMouseLeave={resetMove}
                  onMouseEnter={handleMove}
                >
                  <div className={styles.imageWrap}>
                    <img src={p.img} alt={p.title} className={styles.image} />
                  </div>
                  <div className={styles.overlay}>
                    <h3 className={styles.overlayTitle}>{p.title}</h3>
                    <p className={styles.overlayBlurb}>{p.blurb}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Next"
              className={`${styles.navBtn} ${styles.right}`}
              onClick={() => scrollByTile(1)}
              disabled={!canRight}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </section>
      </section>
        <FooterMatrix overlay={false} />
    </>
  );
};

export default About;
