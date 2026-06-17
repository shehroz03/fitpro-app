// ─────────────────────────────────────────────────────────────────────────────
//  FitCore — Avatar Frame Definitions (SVG, premium + perfect fit)
//
//  Every frame ring is computed from the AVATAR radius (not the padding), so it
//  hugs the DP edge perfectly at any size (header 42px, profile 82px, selector).
//
//  Renderer signature: ({ S, avatarSize, uid }) => <Svg .../>
//    S          = full container size (avatar + padding*2)
//    avatarSize = inner avatar diameter
//    uid        = unique string for gradient ids (avoids collisions)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import Svg, {
  Circle, Ellipse, Path, G, Polygon,
  Defs, LinearGradient, RadialGradient, Stop,
} from 'react-native-svg';

// polar helper — angle in degrees, 0° = top, clockwise
const pol = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const pt = (cx, cy, r, deg) => { const [x, y] = pol(cx, cy, r, deg); return `${x},${y}`; };

// star polygon points (5-point)
const starPts = (cx, cy, outer, inner, rot = 0) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    p.push(pt(cx, cy, r, rot + i * 36));
  }
  return p.join(' ');
};

// heart path centred on (px,py), height hs (24x24 base path, scaled)
const HeartG = ({ px, py, hs, fill }) => {
  const s = hs / 24;
  return (
    <G transform={`translate(${px - 12 * s} ${py - 11 * s}) scale(${s})`}>
      <Path
        d="M12 21 C12 21 3 13.5 3 8.5 C3 5.4 5.4 3 8.5 3 C10.2 3 11.5 4 12 5 C12.5 4 13.8 3 15.5 3 C18.6 3 21 5.4 21 8.5 C21 13.5 12 21 12 21 Z"
        fill={fill} />
    </G>
  );
};

// shared ring geometry from the avatar
const ringGeo = (S, avatarSize, wMul = 0.075) => {
  const c = S / 2, ar = avatarSize / 2;
  const w = avatarSize * wMul;
  const rr = ar + avatarSize * 0.025 + w / 2;   // ring centre radius, hugs avatar
  return { c, ar, w, rr };
};

// ═══════════════════════════════════════════════════════════════════════════
//  GRADIENT / GLOW RING FACTORY
// ═══════════════════════════════════════════════════════════════════════════
const makeRing = ({ c1, c2, glow, glowColor, inner, innerColor, dots, dotColor, beads }) =>
  function Ring({ S, avatarSize, uid }) {
    const { c, w, rr } = ringGeo(S, avatarSize);
    const gid = `${uid}-rg`;
    const els = [];
    if (glow) {
      els.push(<Circle key="g" cx={c} cy={c} r={rr} fill="none"
        stroke={glowColor || c1} strokeWidth={w * 2.4} strokeOpacity={0.20} />);
    }
    if (beads) {
      const N = 22;
      for (let i = 0; i < N; i++) {
        const [x, y] = pol(c, c, rr, (i / N) * 360);
        els.push(<Circle key={i} cx={x} cy={y} r={w * 0.6} fill={`url(#${gid})`} />);
      }
    } else {
      els.push(<Circle key="r" cx={c} cy={c} r={rr} fill="none"
        stroke={`url(#${gid})`} strokeWidth={w} />);
    }
    if (inner) {
      els.push(<Circle key="i" cx={c} cy={c} r={rr - w * 0.95} fill="none"
        stroke={innerColor || c2} strokeWidth={w * 0.34} />);
    }
    if (dots) {
      [0, 90, 180, 270].forEach((a, i) => {
        const [x, y] = pol(c, c, rr, a);
        els.push(<Circle key={`d${i}`} cx={x} cy={y} r={w * 0.72} fill={dotColor || c2} />);
      });
    }
    return (
      <Svg width={S} height={S}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        {els}
      </Svg>
    );
  };

// ═══════════════════════════════════════════════════════════════════════════
//  RAINBOW — smooth 24-wedge ring
// ═══════════════════════════════════════════════════════════════════════════
const RAINBOW = ['#FF1E1E','#FF5A00','#FF8A00','#FFC400','#FFE600','#C6FF00',
                 '#5BFF2E','#00FF7F','#00FFC2','#00E5FF','#00B3FF','#1E7BFF',
                 '#3A4DFF','#6A2BFF','#9B1EFF','#C400FF','#E600D6','#FF0098',
                 '#FF1E6B','#FF2A4D','#FF3030','#FF4A1E','#FF6A00','#FF2E7A'];
function RainbowFrame({ S, avatarSize }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const r2 = rr + w / 2, r1 = rr - w / 2;
  const N = RAINBOW.length, segs = [];
  for (let i = 0; i < N; i++) {
    const a1 = (i / N) * 360, a2 = ((i + 1) / N) * 360 + 0.6; // overlap removes gaps
    segs.push(
      <Path key={i}
        d={`M${pt(c,c,r2,a1)} A ${r2} ${r2} 0 0 1 ${pt(c,c,r2,a2)} L${pt(c,c,r1,a2)} A ${r1} ${r1} 0 0 0 ${pt(c,c,r1,a1)} Z`}
        fill={RAINBOW[i]} />
    );
  }
  return <Svg width={S} height={S}>{segs}</Svg>;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATOM — 3 bronze orbits + electrons
// ═══════════════════════════════════════════════════════════════════════════
function AtomFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.06);
  const g = `${uid}-atom`;
  const rx = rr, ry = rr * 0.42;
  const orbits = [0, 60, 120];
  const electrons = orbits.map((rot, i) => {
    // place an electron on each orbit
    const [ex, ey] = pol(c, c, rx, rot + 90);
    return <Circle key={`e${i}`} cx={ex} cy={ey} r={w * 0.85} fill="#F4C430" />;
  });
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3A2710" />
          <Stop offset="0.5" stopColor="#E0AC4A" />
          <Stop offset="1" stopColor="#7A4E16" />
        </LinearGradient>
      </Defs>
      {orbits.map(rot => (
        <Ellipse key={rot} cx={c} cy={c} rx={rx} ry={ry}
          stroke={`url(#${g})`} strokeWidth={w} fill="none"
          transform={`rotate(${rot} ${c} ${c})`} />
      ))}
      {electrons}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CROWN — gold ring + crown on top
// ═══════════════════════════════════════════════════════════════════════════
function CrownFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize);
  const g = `${uid}-cr`;
  const [tx, ty] = pol(c, c, rr, 0);          // top of ring
  const W = avatarSize * 0.22, H = avatarSize * 0.20;
  const base = ty + w * 0.2;
  const crown =
    `${tx - W},${base} ${tx - W},${base - H * 0.5} ${tx - W * 0.5},${base - H * 0.15} ` +
    `${tx},${base - H} ${tx + W * 0.5},${base - H * 0.15} ${tx + W},${base - H * 0.5} ${tx + W},${base}`;
  const gems = [[-W, -H * 0.5], [0, -H], [W, -H * 0.5]];
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="1" stopColor="#E0A300" />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={`url(#${g})`} strokeWidth={w} />
      <Polygon points={crown} fill={`url(#${g})`} stroke="#B8860B" strokeWidth={0.7} />
      {gems.map(([dx, dy], i) => (
        <Circle key={i} cx={tx + dx} cy={base + dy} r={w * 0.4} fill="#FF3B6B" />
      ))}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAT — ring + two ears
// ═══════════════════════════════════════════════════════════════════════════
function CatFrame({ S, avatarSize }) {
  const { c, w, rr } = ringGeo(S, avatarSize);
  const ear = (ang, key) => {
    const inA = ang - 17, outA = ang + 17;
    const [ax, ay] = pol(c, c, rr + avatarSize * 0.16, ang);
    return (
      <G key={key}>
        <Polygon points={`${pt(c,c,rr,inA)} ${pt(c,c,rr,outA)} ${ax},${ay}`}
          fill="#F4F4F4" stroke="#C0202F" strokeWidth={w * 0.5} strokeLinejoin="round" />
        <Polygon
          points={`${pt(c,c,rr+w*0.4,inA+5)} ${pt(c,c,rr+w*0.4,outA-5)} ${pt(c,c,rr+avatarSize*0.1,ang)}`}
          fill="#FF9BB0" />
      </G>
    );
  };
  return (
    <Svg width={S} height={S}>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#C0202F" strokeWidth={w} />
      {ear(322, 'L')}
      {ear(38, 'R')}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  HEARTS — ring + hearts
// ═══════════════════════════════════════════════════════════════════════════
function HeartsFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize);
  const g = `${uid}-hp`;
  const hs = avatarSize * 0.2;
  const angles = [0, 90, 180, 270];
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6B8B" />
          <Stop offset="1" stopColor="#E81E4D" />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={`url(#${g})`} strokeWidth={w} />
      {angles.map((a, i) => {
        const [x, y] = pol(c, c, rr, a);
        return <HeartG key={i} px={x} py={y} hs={hs} fill="#FF2D6B" />;
      })}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  STARS — ring + stars
// ═══════════════════════════════════════════════════════════════════════════
function StarsFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize);
  const g = `${uid}-st`;
  const so = avatarSize * 0.11, si = so * 0.45;
  const angles = [0, 72, 144, 216, 288];
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="1" stopColor="#FFB300" />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={`url(#${g})`} strokeWidth={w} />
      {angles.map((a, i) => {
        const [x, y] = pol(c, c, rr, a);
        return <Polygon key={i} points={starPts(x, y, so, si, a)} fill="#FFC400"
          stroke="#E0A300" strokeWidth={0.6} />;
      })}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FRAME LIST
// ═══════════════════════════════════════════════════════════════════════════
export const FRAMES = [
  { id: 'none',    label: 'Default',  padRatio: 0,    Render: null },

  { id: 'gold',    label: 'Gold',     padRatio: 0.16,
    Render: makeRing({ c1: '#FFE27A', c2: '#E0A300', glow: true, glowColor: '#FFD700', dots: true, dotColor: '#FFF1A8' }) },
  { id: 'rainbow', label: 'Rainbow',  padRatio: 0.15, Render: RainbowFrame },
  { id: 'neon',    label: 'Neon',     padRatio: 0.16,
    Render: makeRing({ c1: '#00FF9D', c2: '#00C46A', glow: true, glowColor: '#00FF7F' }) },
  { id: 'crown',   label: 'Crown',    padRatio: 0.26, Render: CrownFrame },
  { id: 'cat',     label: 'Cat',      padRatio: 0.26, Render: CatFrame },
  { id: 'hearts',  label: 'Love',     padRatio: 0.22, Render: HeartsFrame },
  { id: 'stars',   label: 'Stars',    padRatio: 0.20, Render: StarsFrame },
  { id: 'atom',    label: 'Atom',     padRatio: 0.14, Render: AtomFrame },
  { id: 'purple',  label: 'Purple',   padRatio: 0.16,
    Render: makeRing({ c1: '#B388FF', c2: '#6A2BFF', glow: true, glowColor: '#9B6DFF', inner: true, innerColor: '#5B2EFF' }) },
  { id: 'fire',    label: 'Fire',     padRatio: 0.16,
    Render: makeRing({ c1: '#FFB300', c2: '#FF3B00', glow: true, glowColor: '#FF6B00', inner: true, innerColor: '#FFD700' }) },
  { id: 'ice',     label: 'Ice',      padRatio: 0.16,
    Render: makeRing({ c1: '#9BE8FF', c2: '#0094E0', glow: true, glowColor: '#00CFFF', dots: true, dotColor: '#E0F7FF' }) },
  { id: 'beads',   label: 'Beads',    padRatio: 0.16,
    Render: makeRing({ c1: '#FFD700', c2: '#FF8A00', beads: true }) },
];

export const getFrame = (id) => FRAMES.find(f => f.id === id) || FRAMES[0];
