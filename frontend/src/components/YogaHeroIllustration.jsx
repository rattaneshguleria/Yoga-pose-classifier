export default function YogaHeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 430"
      role="img"
      aria-label="A seated yoga figure on a glowing platform, with pose tracking points and YogaVision analysis cards"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full overflow-visible"
    >
      <style>{`
        .yvi-float { animation: yvi-float 4.8s ease-in-out infinite; }
        .yvi-float-late { animation: yvi-float 5.4s ease-in-out -1.7s infinite; }
        .yvi-pulse { animation: yvi-pulse 2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes yvi-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        @keyframes yvi-pulse { 0%,100% { opacity: .55; transform: scale(.85) } 50% { opacity: 1; transform: scale(1.2) } }
        @media (prefers-reduced-motion: reduce) { .yvi-float, .yvi-float-late, .yvi-pulse { animation: none !important; } }
        @media (max-width: 560px) { .yvi-chip { display: none; } }
      `}</style>

      <defs>
        <radialGradient id="yvi-glow" cx="50%" cy="48%" r="55%">
          <stop offset="0" stopColor="#ffc39f" stopOpacity=".36" />
          <stop offset=".55" stopColor="#9cba9f" stopOpacity=".2" />
          <stop offset="1" stopColor="#17271c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="yvi-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dce9dc" stopOpacity=".96" />
          <stop offset=".22" stopColor="#a5c1a7" stopOpacity=".9" />
          <stop offset=".52" stopColor="#52765a" stopOpacity=".98" />
          <stop offset="1" stopColor="#2b4934" />
        </linearGradient>
        <linearGradient id="yvi-disc-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5faf4" />
          <stop offset=".55" stopColor="#c0d3c1" />
          <stop offset="1" stopColor="#83a98a" />
        </linearGradient>
        <linearGradient id="yvi-body" x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#a7c5a8" />
          <stop offset=".42" stopColor="#6f9677" />
          <stop offset="1" stopColor="#3b5943" />
        </linearGradient>
        <linearGradient id="yvi-limb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc49f" />
          <stop offset=".56" stopColor="#e88982" />
          <stop offset="1" stopColor="#b36e64" />
        </linearGradient>
        <radialGradient id="yvi-head" cx="34%" cy="25%" r="78%">
          <stop offset="0" stopColor="#ffe0bd" />
          <stop offset=".48" stopColor="#f4a99b" />
          <stop offset="1" stopColor="#bc796c" />
        </radialGradient>
        <radialGradient id="yvi-violet-ball" cx="30%" cy="25%" r="75%">
          <stop offset="0" stopColor="#e8f1e7" />
          <stop offset=".42" stopColor="#9cba9f" />
          <stop offset="1" stopColor="#52765a" />
        </radialGradient>
        <radialGradient id="yvi-peach-ball" cx="30%" cy="25%" r="75%">
          <stop offset="0" stopColor="#f5faf4" />
          <stop offset=".45" stopColor="#b9d0bb" />
          <stop offset="1" stopColor="#6f9677" />
        </radialGradient>
        <linearGradient id="yvi-chip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset="1" stopColor="#fff" stopOpacity=".08" />
        </linearGradient>
        <filter id="yvi-shadow" x="-30%" y="-40%" width="160%" height="190%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <filter id="yvi-chip-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#09061d" floodOpacity=".28" />
        </filter>
      </defs>

      {/* Diffuse light and glossy meditation platform */}
      <ellipse cx="200" cy="214" rx="194" ry="198" fill="url(#yvi-glow)" />
      <ellipse cx="200" cy="365" rx="116" ry="21" fill="#08051a" opacity=".48" filter="url(#yvi-shadow)" />
      <ellipse cx="200" cy="347" rx="121" ry="39" fill="#2b4934" />
      <path d="M79 326v18c0 23 54 42 121 42s121-19 121-42v-18" fill="url(#yvi-disc)" />
      <ellipse cx="200" cy="326" rx="121" ry="40" fill="url(#yvi-disc-top)" />
      <ellipse cx="200" cy="326" rx="101" ry="29" fill="none" stroke="#e7f0e7" strokeOpacity=".75" strokeWidth="1.2" />
      <ellipse cx="200" cy="326" rx="79" ry="21" fill="none" stroke="#e7f0e7" strokeOpacity=".48" strokeWidth="1" />
      <ellipse cx="200" cy="326" rx="54" ry="13" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1" />

      {/* Floating polished spheres */}
      <g className="yvi-float"><circle cx="88" cy="183" r="16" fill="url(#yvi-violet-ball)" /><circle cx="83" cy="178" r="4" fill="#fff" opacity=".6" /></g>
      <g className="yvi-float-late"><circle cx="315" cy="210" r="12" fill="url(#yvi-peach-ball)" /><circle cx="311" cy="206" r="3" fill="#fff" opacity=".7" /></g>
      <g className="yvi-float"><circle cx="292" cy="112" r="8" fill="url(#yvi-violet-ball)" /><circle cx="289" cy="109" r="2" fill="#fff" opacity=".65" /></g>
      <g className="yvi-float-late"><circle cx="119" cy="270" r="7" fill="url(#yvi-peach-ball)" /><circle cx="117" cy="267" r="1.8" fill="#fff" opacity=".65" /></g>

      {/* Seated figure: legs, torso, arms, and head */}
      <path d="M166 281c-24 0-50 9-58 24-8 14 8 22 29 19l51-8c17-3 23-17 13-27-8-7-21-8-35-8Z" fill="url(#yvi-limb)" />
      <path d="M234 281c24 0 50 9 58 24 8 14-8 22-29 19l-51-8c-17-3-23-17-13-27 8-7 21-8 35-8Z" fill="url(#yvi-limb)" />
      <path d="M178 220c-12 12-18 34-18 59 0 20 16 32 40 32s40-12 40-32c0-25-6-47-18-59Z" fill="url(#yvi-body)" />
      <path d="M174 229c-11 13-23 27-37 36-11 7-20 5-27-2-7-8-4-18 5-26l38-33c7-6 18-5 24 2 6 7 4 16-3 23Z" fill="url(#yvi-limb)" />
      <path d="M226 229c11 13 23 27 37 36 11 7 20 5 27-2 7-8 4-18-5-26l-38-33c-7-6-18-5-24 2-6 7-4 16 3 23Z" fill="url(#yvi-limb)" />
      <path d="M117 237c-4 4-5 10-2 14 3 4 9 4 13 1l8-6-13-14Z" fill="#ffbe9e" />
      <path d="M283 237c4 4 5 10 2 14-3 4-9 4-13 1l-8-6 13-14Z" fill="#ffbe9e" />
      <path d="M188 207c0 10-5 15-5 20 0 9 8 14 17 14s17-5 17-14c0-5-5-10-5-20Z" fill="url(#yvi-limb)" />
      <circle cx="200" cy="174" r="29" fill="url(#yvi-head)" />
      <ellipse cx="190" cy="164" rx="8" ry="5" fill="#fff" opacity=".27" transform="rotate(-28 190 164)" />

      {/* Pose tracking skeleton overlay */}
      <g fill="none" stroke="#d6e5d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".9">
        <path d="M200 174 200 205 174 216 145 239 126 248" />
        <path d="M200 205 226 216 255 239 274 248" />
        <path d="M174 216 200 229 226 216" />
        <path d="M200 229 200 265 177 289 139 311" />
        <path d="M200 265 223 289 261 311" />
      </g>
      <g fill="#ffe0cb" stroke="#75977b" strokeWidth="1.5">
        <circle cx="200" cy="174" r="4.5" /><circle cx="200" cy="205" r="4" />
        <circle cx="174" cy="216" r="4" /><circle cx="226" cy="216" r="4" />
        <circle cx="145" cy="239" r="4" /><circle cx="255" cy="239" r="4" />
        <circle cx="126" cy="248" r="4" /><circle cx="274" cy="248" r="4" />
        <circle cx="200" cy="229" r="4" /><circle cx="200" cy="265" r="4" />
        <circle cx="177" cy="289" r="4" /><circle cx="223" cy="289" r="4" />
      </g>
      <g className="yvi-pulse" fill="none" stroke="#d7eadb" strokeWidth="1.2" opacity=".8">
        <circle cx="200" cy="174" r="8" /><circle cx="126" cy="248" r="7" /><circle cx="274" cy="248" r="7" />
      </g>

      {/* Floating translucent information cards */}
      <g className="yvi-chip yvi-float-late" filter="url(#yvi-chip-shadow)">
        <rect x="4" y="91" width="139" height="62" rx="15" fill="url(#yvi-chip)" stroke="#fff" strokeOpacity=".3" />
        <circle cx="22" cy="113" r="5" fill="#a8c3a0" />
        <text x="34" y="116" fill="#fff" fontSize="10" fontFamily="system-ui, sans-serif" fontWeight="600">Pose detected</text>
        <text x="17" y="136" fill="#dfe8df" fontSize="10" fontFamily="system-ui, sans-serif">Easy pose</text>
      </g>
      <g className="yvi-chip yvi-float" filter="url(#yvi-chip-shadow)">
        <rect x="254" y="143" width="142" height="67" rx="15" fill="url(#yvi-chip)" stroke="#fff" strokeOpacity=".3" />
        <text x="267" y="166" fill="#fff" fontSize="10" fontFamily="system-ui, sans-serif" fontWeight="600">Alignment</text>
        <text x="267" y="190" fill="#b9d0bb" fontSize="18" fontFamily="system-ui, sans-serif" fontWeight="600">94%</text>
        <text x="307" y="189" fill="#dfe8df" fontSize="9" fontFamily="system-ui, sans-serif">Spine 178°</text>
      </g>
      <g className="yvi-chip yvi-float-late" filter="url(#yvi-chip-shadow)">
        <rect x="24" y="277" width="145" height="60" rx="15" fill="url(#yvi-chip)" stroke="#fff" strokeOpacity=".3" />
        <path d="M39 296h10l4 4v13H39Z" fill="none" stroke="#b9d0bb" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M49 296v5h4" fill="none" stroke="#b9d0bb" strokeWidth="1.2" />
        <text x="61" y="302" fill="#fff" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="600">Runs in your browser</text>
        <text x="39" y="322" fill="#dfe8df" fontSize="9" fontFamily="system-ui, sans-serif">Video never leaves your device</text>
      </g>
    </svg>
  )
}
