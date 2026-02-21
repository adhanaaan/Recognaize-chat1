import React from 'react'

// Brain outline path (side view, facing left)
const BRAIN_OUTLINE = "M 30,72 C 18,66 8,52 10,38 C 12,26 22,14 36,9 C 50,3 64,2 78,6 C 88,10 96,20 100,32 C 104,44 102,56 96,64 C 93,68 91,74 94,82 Q 89,88 82,84 C 70,80 54,82 42,82 C 36,82 32,78 30,74 Z"

// Decorative sulci/fissures to make the brain look realistic
const BRAIN_DETAILS = [
  // Central sulcus (divides frontal/parietal)
  "M 56,8 C 54,16 52,28 54,42",
  // Lateral sulcus (Sylvian fissure)
  "M 32,62 C 40,54 50,48 64,46",
  // Superior frontal sulcus
  "M 22,24 C 30,22 38,18 46,12",
  // Brain wrinkle lines
  "M 68,10 C 74,14 80,20 84,28",
  "M 40,30 C 44,26 50,24 54,22",
  "M 72,32 C 78,36 84,42 88,50",
]

const DOMAINS = [
  {
    id: 'memory',
    name: 'Working Memory',
    game: 'Grocery Shopping',
    brainRegion: 'Hippocampus & Prefrontal Cortex',
    description: 'Temporarily holding and manipulating information — like remembering a shopping list while navigating a store.',
    color: '#7c3aed',
    colorLight: 'rgba(124, 58, 237, 0.18)',
    highlights: [
      { cx: 46, cy: 56, rx: 14, ry: 11 },
      { cx: 24, cy: 36, rx: 14, ry: 18 },
    ],
    labelPos: { x: 24, y: 18 },
  },
  {
    id: 'executive',
    name: 'Executive Function',
    game: 'Trail Making',
    brainRegion: 'Frontal Lobe',
    description: 'Planning, organizing, and flexibly switching between tasks — the brain\'s command center.',
    color: '#0f766e',
    colorLight: 'rgba(15, 118, 110, 0.18)',
    highlights: [
      { cx: 28, cy: 40, rx: 22, ry: 28 },
    ],
    labelPos: { x: 18, y: 18 },
  },
  {
    id: 'attention',
    name: 'Attention & Impulse Control',
    game: 'Airplane Game',
    brainRegion: 'Parietal & Prefrontal Networks',
    description: 'Sustaining focus, filtering distractions, and controlling impulsive responses.',
    color: '#d97706',
    colorLight: 'rgba(217, 119, 6, 0.18)',
    highlights: [
      { cx: 74, cy: 22, rx: 18, ry: 16 },
      { cx: 20, cy: 38, rx: 12, ry: 16 },
    ],
    labelPos: { x: 60, y: 12 },
  },
  {
    id: 'speed',
    name: 'Processing Speed',
    game: 'Symbol Matching',
    brainRegion: 'White Matter Pathways',
    description: 'How quickly your brain perceives, processes, and responds to information.',
    color: '#2563eb',
    colorLight: 'rgba(37, 99, 235, 0.18)',
    highlights: [
      { cx: 36, cy: 40, rx: 9, ry: 7 },
      { cx: 54, cy: 36, rx: 9, ry: 7 },
      { cx: 72, cy: 42, rx: 9, ry: 7 },
      { cx: 45, cy: 52, rx: 7, ry: 5 },
      { cx: 62, cy: 50, rx: 7, ry: 5 },
    ],
    labelPos: { x: 38, y: 30 },
  },
]

function BrainSVG({ domain }) {
  const clipId = `brain-clip-${domain.id}`
  return (
    <svg viewBox="0 0 120 95" className="brain-svg" aria-label={`Brain diagram highlighting ${domain.brainRegion}`}>
      <defs>
        <clipPath id={clipId}>
          <path d={BRAIN_OUTLINE} />
        </clipPath>
        <filter id={`glow-${domain.id}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Brain base fill */}
      <path d={BRAIN_OUTLINE} fill="#e8f5f3" stroke="none" />

      {/* Highlighted regions (clipped to brain shape) */}
      <g clipPath={`url(#${clipId})`}>
        {domain.highlights.map((h, i) => (
          <ellipse
            key={i}
            cx={h.cx}
            cy={h.cy}
            rx={h.rx}
            ry={h.ry}
            fill={domain.color}
            opacity="0.25"
            filter={`url(#glow-${domain.id})`}
          />
        ))}
        {domain.highlights.map((h, i) => (
          <ellipse
            key={`core-${i}`}
            cx={h.cx}
            cy={h.cy}
            rx={h.rx * 0.65}
            ry={h.ry * 0.65}
            fill={domain.color}
            opacity="0.35"
          />
        ))}
      </g>

      {/* Brain outline */}
      <path d={BRAIN_OUTLINE} fill="none" stroke="#0f766e" strokeWidth="1.8" />

      {/* Sulci/fissure details */}
      {BRAIN_DETAILS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#99d6cf" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      ))}

      {/* Cerebellum detail lines */}
      <path d="M 86,76 C 84,80 82,82 80,82" fill="none" stroke="#99d6cf" strokeWidth="0.7" opacity="0.5" />
      <path d="M 90,78 C 88,82 86,84 84,84" fill="none" stroke="#99d6cf" strokeWidth="0.7" opacity="0.5" />

      {/* Region label with pointer */}
      <circle cx={domain.labelPos.x} cy={domain.labelPos.y} r="2.5" fill={domain.color} opacity="0.8" />
    </svg>
  )
}

function BrainRegionCards() {
  return (
    <div className="brain-region-section">
      <div className="brain-section-header">
        <div className="brain-section-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6-.5.3-.8.9-.8 1.5V18a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1.5c0-.6-.3-1.2-.8-1.5A7 7 0 0 1 12 2z" />
            <line x1="10" y1="22" x2="14" y2="22" />
          </svg>
        </div>
        <div>
          <h3 className="brain-section-title">What We Measured</h3>
          <p className="brain-section-subtitle">Each game targets a specific cognitive domain linked to distinct brain regions</p>
        </div>
      </div>
      <div className="brain-cards-grid">
        {DOMAINS.map((domain) => (
          <div key={domain.id} className="brain-card" style={{ '--domain-color': domain.color, '--domain-color-light': domain.colorLight }}>
            <div className="brain-card-visual">
              <BrainSVG domain={domain} />
            </div>
            <div className="brain-card-info">
              <span className="brain-card-game" style={{ color: domain.color }}>{domain.game}</span>
              <h4 className="brain-card-domain">{domain.name}</h4>
              <div className="brain-card-region">
                <svg viewBox="0 0 16 16" width="12" height="12" fill={domain.color}>
                  <circle cx="8" cy="8" r="4" opacity="0.6" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
                <span>{domain.brainRegion}</span>
              </div>
              <p className="brain-card-desc">{domain.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BrainRegionCards
