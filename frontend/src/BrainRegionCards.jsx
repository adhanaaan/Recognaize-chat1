import React from 'react'

const BRAIN_OUTLINE = "M 30,72 C 18,66 8,52 10,38 C 12,26 22,14 36,9 C 50,3 64,2 78,6 C 88,10 96,20 100,32 C 104,44 102,56 96,64 C 93,68 91,74 94,82 Q 89,88 82,84 C 70,80 54,82 42,82 C 36,82 32,78 30,74 Z"

const SULCI = [
  "M 56,8 C 54,16 52,28 54,42",
  "M 32,62 C 40,54 50,48 64,46",
  "M 22,24 C 30,22 38,18 46,12",
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
    highlights: [
      { cx: 46, cy: 56, rx: 14, ry: 11 },
      { cx: 24, cy: 36, rx: 14, ry: 18 },
    ],
  },
  {
    id: 'executive',
    name: 'Executive Function',
    game: 'Trail Making',
    brainRegion: 'Frontal Lobe',
    description: "Planning, organizing, and flexibly switching between tasks — the brain's command center.",
    color: '#0f766e',
    highlights: [
      { cx: 28, cy: 40, rx: 22, ry: 28 },
    ],
  },
  {
    id: 'attention',
    name: 'Attention & Impulse Control',
    game: 'Airplane Game',
    brainRegion: 'Parietal & Prefrontal Networks',
    description: 'Sustaining focus, filtering distractions, and controlling impulsive responses.',
    color: '#d97706',
    highlights: [
      { cx: 74, cy: 22, rx: 18, ry: 16 },
      { cx: 20, cy: 38, rx: 12, ry: 16 },
    ],
  },
  {
    id: 'speed',
    name: 'Processing Speed',
    game: 'Symbol Matching',
    brainRegion: 'White Matter Pathways',
    description: 'How quickly your brain perceives, processes, and responds to information.',
    color: '#2563eb',
    highlights: [
      { cx: 36, cy: 40, rx: 9, ry: 7 },
      { cx: 54, cy: 36, rx: 9, ry: 7 },
      { cx: 72, cy: 42, rx: 9, ry: 7 },
      { cx: 45, cy: 52, rx: 7, ry: 5 },
      { cx: 62, cy: 50, rx: 7, ry: 5 },
    ],
  },
]

function BrainSVG({ domain }) {
  return (
    <svg viewBox="0 0 120 95" className="brain-svg">
      {/* Brain base fill */}
      <path d={BRAIN_OUTLINE} fill="#e8f5f3" stroke="none" />

      {/* Highlighted regions — outer glow */}
      {domain.highlights.map((h, i) => (
        <ellipse
          key={`glow-${i}`}
          cx={h.cx}
          cy={h.cy}
          rx={h.rx}
          ry={h.ry}
          fill={domain.color}
          opacity="0.2"
        />
      ))}
      {/* Highlighted regions — inner core */}
      {domain.highlights.map((h, i) => (
        <ellipse
          key={`core-${i}`}
          cx={h.cx}
          cy={h.cy}
          rx={h.rx * 0.6}
          ry={h.ry * 0.6}
          fill={domain.color}
          opacity="0.35"
        />
      ))}

      {/* Brain outline */}
      <path d={BRAIN_OUTLINE} fill="none" stroke="#0f766e" strokeWidth="1.8" />

      {/* Sulci detail lines */}
      {SULCI.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#99d6cf" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      ))}

      {/* Cerebellum lines */}
      <path d="M 86,76 C 84,80 82,82 80,82" fill="none" stroke="#99d6cf" strokeWidth="0.7" opacity="0.4" />
      <path d="M 90,78 C 88,82 86,84 84,84" fill="none" stroke="#99d6cf" strokeWidth="0.7" opacity="0.4" />
    </svg>
  )
}

function BrainRegionCards() {
  return (
    <div className="brain-region-section">
      <div className="brain-section-header">
        <div className="brain-section-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 2c-3 3-4 7-4 10s1 7 4 10" />
            <path d="M12 2c3 3 4 7 4 10s-1 7-4 10" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <div>
          <h3 className="brain-section-title">What We Measured</h3>
          <p className="brain-section-subtitle">Each game targets a specific cognitive domain linked to distinct brain regions</p>
        </div>
      </div>
      <div className="brain-cards-grid">
        {DOMAINS.map((domain) => (
          <div key={domain.id} className="brain-card" style={{ '--domain-color': domain.color }}>
            <div className="brain-card-visual">
              <BrainSVG domain={domain} />
            </div>
            <div className="brain-card-info">
              <span className="brain-card-game" style={{ color: domain.color }}>{domain.game}</span>
              <h4 className="brain-card-domain">{domain.name}</h4>
              <div className="brain-card-region">
                <span className="brain-card-dot" style={{ background: domain.color }} />
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
