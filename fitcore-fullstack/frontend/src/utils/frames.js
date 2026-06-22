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
  Circle, Ellipse, Path, G, Polygon, Rect, Line,
  Defs, LinearGradient, RadialGradient, Stop, ClipPath,
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

// ═══════════════════════════════════════════════════════════════════════
// ==========================================================================
//  1. BAROQUE GOLD CROWN
// ==========================================================================
function OrnateGoldFrame({ S, avatarSize, uid }) {
  const c = S / 2;
  const { w, rr } = ringGeo(S, avatarSize, 0.115);
  const g = uid + '-og';
  const topPol = pol(c, c, rr + w * 0.55, 0);
  const tx = topPol[0], ty = topPol[1];
  const cW = avatarSize * 0.30, cH = avatarSize * 0.26;
  const base = ty + w * 0.55;
  const crownPts = [tx-cW,base, tx-cW,base-cH*0.44, tx-cW*0.62,base-cH*0.16, tx-cW*0.26,base-cH*0.82, tx,base-cH*0.32, tx,base-cH, tx,base-cH*0.32, tx+cW*0.26,base-cH*0.82, tx+cW*0.62,base-cH*0.16, tx+cW,base-cH*0.44, tx+cW,base].join(' ');
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"    stopColor="#FFF8C0" /><Stop offset="0.28" stopColor="#FFD700" />
          <Stop offset="0.62" stopColor="#B8860B" /><Stop offset="1"    stopColor="#FFE060" />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFD700" strokeWidth={w*2.8} strokeOpacity={0.14} />
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*1.7} />
      <Circle cx={c} cy={c} r={rr+w*0.72} fill="none" stroke="#B8860B" strokeWidth={w*0.22} />
      <Circle cx={c} cy={c} r={rr-w*0.72} fill="none" stroke="#FFF8C0" strokeWidth={w*0.22} />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
        if (a === 0) return null;
        const p = pol(c, c, rr, a); const x = p[0], y = p[1]; const big = i%3===0;
        return (<G key={i}><Circle cx={x} cy={y} r={w*(big?0.88:0.46)} fill={big?'#FFD700':'#FFF8C0'} stroke="#B8860B" strokeWidth={0.5} />{big&&<Circle cx={x} cy={y} r={w*0.36} fill="#FFF8C0"/>}</G>);
      })}
      {[90,180,270].map((a,i)=>{const p=pol(c,c,rr,a);const x=p[0],y=p[1],fs=avatarSize*0.09;return(<G key={i}><Circle cx={x} cy={y} r={fs*0.55} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.5}/><Circle cx={x} cy={y-fs*0.76} r={fs*0.33} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.4}/><Circle cx={x} cy={y+fs*0.76} r={fs*0.33} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.4}/><Circle cx={x-fs*0.76} cy={y} r={fs*0.33} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.4}/><Circle cx={x+fs*0.76} cy={y} r={fs*0.33} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.4}/></G>);})}
      <Polygon points={crownPts} fill={'url(#'+g+')'} stroke="#B8860B" strokeWidth={0.9} strokeLinejoin="round"/>
      <Circle cx={tx} cy={base-cH+w*0.28} r={w*0.58} fill="#FF2D6B"/>
      <Circle cx={tx-cW*0.26} cy={base-cH*0.82+w*0.18} r={w*0.44} fill="#4A9FFF"/>
      <Circle cx={tx+cW*0.26} cy={base-cH*0.82+w*0.18} r={w*0.44} fill="#4A9FFF"/>
    </Svg>
  );
}

// ==========================================================================
//  2. NEON CIRCUIT
// ==========================================================================
function CircuitFrame({ S, avatarSize, uid }) {
  const c = S / 2;
  const { w, rr } = ringGeo(S, avatarSize, 0.10);
  const g = uid + '-cf'; const cyan = '#00F0FF'; const N = 8;
  const lineLen = avatarSize * 0.10;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00D4E8"/><Stop offset="1" stopColor="#006878"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={cyan} strokeWidth={w*4.0} strokeOpacity={0.10}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={cyan} strokeWidth={w*2.0} strokeOpacity={0.22}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*0.75}/>
      <Circle cx={c} cy={c} r={rr-w*0.6} fill="none" stroke={cyan} strokeWidth={w*0.22} strokeOpacity={0.55}/>
      <Circle cx={c} cy={c} r={rr+w*0.6} fill="none" stroke={cyan} strokeWidth={w*0.16} strokeOpacity={0.35}/>
      {Array.from({length:N},(_,i)=>{
        const angle=(i/N)*360; const rp=pol(c,c,rr,angle); const rx=rp[0],ry=rp[1];
        const ip=pol(c,c,rr-w*0.82,angle); const ix=ip[0],iy=ip[1];
        const perpA=angle+90;
        const p1=pol(rx,ry,lineLen*0.65,perpA); const p2=pol(rx,ry,lineLen*0.65,perpA+180);
        const lr1=pol(c,c,rr-w*1.5,angle); const lr2=pol(c,c,rr-w*2.4,angle+(i%2?10:-10));
        const big=i%2===0;
        return(<G key={i}>
          <Circle cx={rx} cy={ry} r={w*(big?0.72:0.42)} fill={cyan} fillOpacity={0.92}/>
          <Line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={cyan} strokeWidth={w*0.22} strokeOpacity={0.6}/>
          <Circle cx={p1[0]} cy={p1[1]} r={w*0.30} fill={cyan} fillOpacity={0.5}/>
          <Circle cx={p2[0]} cy={p2[1]} r={w*0.30} fill={cyan} fillOpacity={0.5}/>
          {big&&<G><Line x1={ix} y1={iy} x2={lr2[0]} y2={lr2[1]} stroke={cyan} strokeWidth={w*0.22} strokeOpacity={0.48}/><Rect x={lr2[0]-w*0.38} y={lr2[1]-w*0.38} width={w*0.76} height={w*0.76} fill="none" stroke={cyan} strokeWidth={w*0.2} strokeOpacity={0.7}/><Circle cx={lr1[0]} cy={lr1[1]} r={w*0.28} fill={cyan} fillOpacity={0.55}/></G>}
        </G>);
      })}
    </Svg>
  );
}

// ==========================================================================
//  3. CRYSTAL DIAMOND BLING
// ==========================================================================
function CrystalBlingFrame({ S, avatarSize, uid }) {
  const c = S / 2; const { w, rr } = ringGeo(S, avatarSize, 0.105);
  const g1 = uid+'-cb1'; const N=22; const gs=w*0.82;
  const Sparkle = ({cx,cy,size}) => (
    <G>
      <Circle cx={cx} cy={cy} r={size*0.52} fill="white"/>
      {[0,45,90,135].map((a,i)=>{const p=pol(cx,cy,size*1.55,a);return<Line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="white" strokeWidth={size*0.38} strokeOpacity={0.9} strokeLinecap="round"/>;}) }
      {[22.5,67.5,112.5,157.5].map((a,i)=>{const p=pol(cx,cy,size*0.92,a);return<Line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="white" strokeWidth={size*0.18} strokeOpacity={0.55} strokeLinecap="round"/>;}) }
    </G>
  );
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF"/><Stop offset="0.35" stopColor="#C8E8FF"/>
          <Stop offset="0.7" stopColor="#A0C8FF"/><Stop offset="1" stopColor="#FFFFFF"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={w*2.8}/>
      {Array.from({length:N},(_,i)=>{
        const angle=(i/N)*360; const p=pol(c,c,rr,angle); const x=p[0],y=p[1];
        return(<G key={i} transform={'rotate('+angle+' '+x+' '+y+')'}>
          <Polygon points={x+','+(y-gs)+' '+(x-gs*0.68)+','+y+' '+x+','+(y+gs)+' '+(x+gs*0.68)+','+y} fill={'url(#'+g1+')'} stroke="rgba(255,255,255,0.65)" strokeWidth={0.45}/>
          <Polygon points={x+','+(y-gs)+' '+(x-gs*0.68)+','+y+' '+x+','+(y-gs*0.08)} fill="rgba(255,255,255,0.48)"/>
        </G>);
      })}
      {[10,100,190,280].map((a,i)=>{const p=pol(c,c,rr+w*0.15,a);return<Sparkle key={i} cx={p[0]} cy={p[1]} size={w*(i%2?0.88:1.05)}/>;}) }
      {[55,235].map((a,i)=>{
        const bp=pol(c,c,rr+w*0.4,a); const bx=bp[0],by=bp[1];
        return ['#FF6B6B','#FFD700','#00FF87','#00B4FF','#C855FF'].map((col,j)=>{
          const ep=pol(bx,by,w*(1.4+j*0.35),a+(j-2)*14);
          return<Line key={i+'-'+j} x1={bx} y1={by} x2={ep[0]} y2={ep[1]} stroke={col} strokeWidth={w*0.22} strokeOpacity={0.82} strokeLinecap="round"/>;
        });
      })}
    </Svg>
  );
}

// ==========================================================================
//  FEMALE FRAMES — 10 designs
// ==========================================================================

// 1. ROSE GOLD
function RoseGoldFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.085);
  const g = uid+'-rsg';
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFB6C1"/><Stop offset="0.35" stopColor="#E8A0B4"/>
          <Stop offset="0.65" stopColor="#D4A853"/><Stop offset="1" stopColor="#F7C5A0"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFB6C1" strokeWidth={w*3.0} strokeOpacity={0.22}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      <Circle cx={c} cy={c} r={rr+w*0.72} fill="none" stroke="#D4A853" strokeWidth={w*0.22}/>
      <Circle cx={c} cy={c} r={rr-w*0.72} fill="none" stroke="#FFB6C1" strokeWidth={w*0.22}/>
      {[0,90,180,270].map((a,i)=>{const p=pol(c,c,rr,a);return<Circle key={i} cx={p[0]} cy={p[1]} r={w*0.72} fill="#D4A853" stroke="#F7E0A0" strokeWidth={0.5}/>;}) }
    </Svg>
  );
}

// 2. SAKURA — cherry blossom ring
function SakuraFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-sk';
  const petalSize = w * 0.72;
  const Flower = ({ cx, cy }) => (
    <G>
      {[0,72,144,216,288].map((a,i)=>{
        const pr=pol(cx,cy,petalSize*1.1,a);
        return <Ellipse key={i} cx={pr[0]} cy={pr[1]} rx={petalSize*0.55} ry={petalSize*0.82}
          fill="#FFB7C5" opacity={0.92} transform={`rotate(${a} ${pr[0]} ${pr[1]})`}/>;
      })}
      <Circle cx={cx} cy={cy} r={petalSize*0.42} fill="#FFF0F5"/>
    </G>
  );
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFB7C5"/><Stop offset="1" stopColor="#FF8FAB"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFB7C5" strokeWidth={w*2.5} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*0.55}/>
      {[0,72,144,216,288].map((a,i)=>{const p=pol(c,c,rr,a);return <Flower key={i} cx={p[0]} cy={p[1]}/>;}) }
    </Svg>
  );
}

// 3. MERMAID — teal/aqua iridescent ring
function MermaidFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g1=uid+'-mm1'; const g2=uid+'-mm2';
  const scaleN = 20;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00D4C8"/><Stop offset="0.4" stopColor="#7B2FBE"/>
          <Stop offset="0.75" stopColor="#00B4D8"/><Stop offset="1" stopColor="#FF85A1"/>
        </LinearGradient>
        <LinearGradient id={g2} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="rgba(255,255,255,0.5)"/><Stop offset="1" stopColor="rgba(255,255,255,0)"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#00D4C8" strokeWidth={w*3.0} strokeOpacity={0.15}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g1+')'} strokeWidth={w}/>
      {Array.from({length:scaleN},(_,i)=>{
        const a=(i/scaleN)*360; const p=pol(c,c,rr,a);
        const col=['#00D4C8','#7B2FBE','#FF85A1','#00B4D8'][i%4];
        return <Ellipse key={i} cx={p[0]} cy={p[1]} rx={w*0.55} ry={w*0.38}
          fill={col} opacity={0.7} transform={`rotate(${a} ${p[0]} ${p[1]})`}/>;
      })}
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g2+')'} strokeWidth={w*0.4}/>
    </Svg>
  );
}

// 4. CANDY PASTEL — soft pastel rainbow ring
const PASTEL = ['#FFB3C6','#FFC8DD','#CDB4DB','#A2D2FF','#B5EAD7','#FFDAC1','#FFB7B2','#E2F0CB'];
function CandyPastelFrame({ S, avatarSize }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const r2=rr+w/2, r1=rr-w/2; const N=PASTEL.length;
  return (
    <Svg width={S} height={S}>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="rgba(255,182,193,0.22)" strokeWidth={w*2.8}/>
      {Array.from({length:N},(_,i)=>{
        const a1=(i/N)*360, a2=((i+1)/N)*360+0.8;
        return <Path key={i}
          d={`M${pt(c,c,r2,a1)} A${r2} ${r2} 0 0 1 ${pt(c,c,r2,a2)} L${pt(c,c,r1,a2)} A${r1} ${r1} 0 0 0 ${pt(c,c,r1,a1)} Z`}
          fill={PASTEL[i]}/>;
      })}
      {[0,45,90,135,180,225,270,315].map((a,i)=>{
        const p=pol(c,c,rr,a);
        return <Circle key={i} cx={p[0]} cy={p[1]} r={w*0.38} fill="white" opacity={0.7}/>;
      })}
    </Svg>
  );
}

// 5. AURORA — purple→teal northern lights glow
function AuroraFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-au';
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C084FC"/><Stop offset="0.3" stopColor="#818CF8"/>
          <Stop offset="0.65" stopColor="#34D399"/><Stop offset="1" stopColor="#06B6D4"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#C084FC" strokeWidth={w*4.5} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#06B6D4" strokeWidth={w*2.8} strokeOpacity={0.14}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      <Circle cx={c} cy={c} r={rr-w*0.82} fill="none" stroke="#C084FC" strokeWidth={w*0.28} strokeOpacity={0.55}/>
      <Circle cx={c} cy={c} r={rr+w*0.82} fill="none" stroke="#06B6D4" strokeWidth={w*0.22} strokeOpacity={0.45}/>
      {[30,90,150,210,270,330].map((a,i)=>{
        const p=pol(c,c,rr,a);
        const col=['#C084FC','#34D399','#06B6D4','#818CF8','#C084FC','#34D399'][i];
        return <Circle key={i} cx={p[0]} cy={p[1]} r={w*0.45} fill={col} opacity={0.88}/>;
      })}
    </Svg>
  );
}

// 6. PEARL — cream pearl beads ring
function PearlBeadsFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.085);
  const g = uid+'-pb'; const N = 24;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <RadialGradient id={g} cx="0.35" cy="0.3" r="0.65">
          <Stop offset="0" stopColor="#FFFFFF"/><Stop offset="0.45" stopColor="#F2EBE0"/>
          <Stop offset="1" stopColor="#D4C5B0"/>
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#F2EBE0" strokeWidth={w*2.5} strokeOpacity={0.22}/>
      {Array.from({length:N},(_,i)=>{
        const p=pol(c,c,rr,(i/N)*360);
        return <G key={i}>
          <Circle cx={p[0]} cy={p[1]} r={w*0.72} fill={'url(#'+g+')'} stroke="#C8B89A" strokeWidth={0.5}/>
          <Circle cx={p[0]-w*0.2} cy={p[1]-w*0.2} r={w*0.22} fill="rgba(255,255,255,0.7)"/>
        </G>;
      })}
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#C8B89A" strokeWidth={w*0.22} strokeOpacity={0.5}/>
    </Svg>
  );
}

// 7. BUTTERFLY — pink ring with butterfly wings at 4 positions
function ButterflyFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.085);
  const g = uid+'-bf';
  const ws = w * 1.4;
  const Wing = ({ cx, cy, angle }) => {
    const a = (angle-90)*Math.PI/180;
    return (
      <G>
        <Ellipse cx={cx + Math.cos(a)*ws*0.7} cy={cy + Math.sin(a)*ws*0.7}
          rx={ws} ry={ws*0.55} fill="#FF85A1" opacity={0.82}
          transform={`rotate(${angle} ${cx} ${cy})`}/>
        <Ellipse cx={cx - Math.cos(a)*ws*0.7} cy={cy - Math.sin(a)*ws*0.7}
          rx={ws*0.7} ry={ws*0.4} fill="#FFB3C6" opacity={0.72}
          transform={`rotate(${angle} ${cx} ${cy})`}/>
        <Circle cx={cx} cy={cy} r={w*0.32} fill="#FF4D8D"/>
      </G>
    );
  };
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF85A1"/><Stop offset="1" stopColor="#FFB3C6"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*0.55}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FF85A1" strokeWidth={w*2.5} strokeOpacity={0.15}/>
      {[0,90,180,270].map((a,i)=>{
        const p=pol(c,c,rr,a);
        return <Wing key={i} cx={p[0]} cy={p[1]} angle={a}/>;
      })}
    </Svg>
  );
}

// 8. GLAM — hot pink ring with sparkle stars
function GlamFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-gl';
  const Sparkle = ({ cx, cy, size }) => (
    <G>
      {[0,45,90,135].map((a,i)=>{
        const p1=pol(cx,cy,size*0.35,a); const p2=pol(cx,cy,size*1.5,a);
        return <Line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
          stroke="white" strokeWidth={size*0.32} strokeOpacity={0.92} strokeLinecap="round"/>;
      })}
      <Circle cx={cx} cy={cy} r={size*0.42} fill="white"/>
    </G>
  );
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF1493"/><Stop offset="0.5" stopColor="#FF69B4"/>
          <Stop offset="1" stopColor="#FF1493"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FF1493" strokeWidth={w*3.5} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      <Circle cx={c} cy={c} r={rr-w*0.78} fill="none" stroke="#FF69B4" strokeWidth={w*0.22}/>
      {[0,40,80,120,160,200,240,280,320].map((a,i)=>{
        const p=pol(c,c,rr,a); const big=i%3===0;
        return big
          ? <Sparkle key={i} cx={p[0]} cy={p[1]} size={w*(big?0.88:0.52)}/>
          : <Circle key={i} cx={p[0]} cy={p[1]} r={w*0.38} fill="#FF69B4" opacity={0.9}/>;
      })}
    </Svg>
  );
}

// 9. FLORAL VINE — ring with 4 flower + leaf accents
function FloralVineFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-fv';
  const fs = w * 0.82;
  const Flower5 = ({ cx, cy, col }) => (
    <G>
      {[0,72,144,216,288].map((a,i)=>{
        const p=pol(cx,cy,fs,a);
        return <Circle key={i} cx={p[0]} cy={p[1]} r={fs*0.55} fill={col} opacity={0.88}/>;
      })}
      <Circle cx={cx} cy={cy} r={fs*0.38} fill="#FFF0F5"/>
    </G>
  );
  const Leaf = ({ cx, cy, angle }) => {
    const a=(angle-90)*Math.PI/180;
    return <Ellipse cx={cx} cy={cy} rx={fs*0.55} ry={fs*1.1}
      fill="#7DC67E" opacity={0.75} transform={`rotate(${angle} ${cx} ${cy})`}/>;
  };
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF8FAB"/><Stop offset="1" stopColor="#FFC8DD"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*0.55} strokeDasharray="4 6"/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFB7C5" strokeWidth={w*2.2} strokeOpacity={0.14}/>
      {[0,90,180,270].map((a,i)=>{
        const p=pol(c,c,rr,a);
        return <Flower5 key={i} cx={p[0]} cy={p[1]} col={['#FF8FAB','#FFB3C6','#FF69B4','#FFC0CB'][i]}/>;
      })}
      {[45,135,225,315].map((a,i)=>{
        const p=pol(c,c,rr,a);
        return <Leaf key={i} cx={p[0]} cy={p[1]} angle={a}/>;
      })}
    </Svg>
  );
}

// 10. PRINCESS — pink ring + tiara on top + hearts at sides
function PrincessFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.085);
  const g = uid+'-pr';
  const [tx, ty] = pol(c, c, rr, 0);
  const cW = avatarSize * 0.22, cH = avatarSize * 0.20;
  const base = ty + w * 0.3;
  const tiaraPts = `${tx-cW},${base} ${tx-cW*0.7},${base-cH*0.45} ${tx-cW*0.35},${base-cH*0.15} ${tx-cW*0.1},${base-cH*0.75} ${tx},${base-cH} ${tx+cW*0.1},${base-cH*0.75} ${tx+cW*0.35},${base-cH*0.15} ${tx+cW*0.7},${base-cH*0.45} ${tx+cW},${base}`;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFB6C1"/><Stop offset="0.5" stopColor="#FF85A1"/>
          <Stop offset="1" stopColor="#C084FC"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFB6C1" strokeWidth={w*3.0} strokeOpacity={0.20}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      <Circle cx={c} cy={c} r={rr-w*0.82} fill="none" stroke="#FFB6C1" strokeWidth={w*0.22}/>
      <Polygon points={tiaraPts} fill={'url(#'+g+')'} stroke="#D4A0C0" strokeWidth={0.8} strokeLinejoin="round"/>
      <Circle cx={tx} cy={base-cH} r={w*0.52} fill="#FF1493"/>
      <Circle cx={tx-cW*0.1} cy={base-cH*0.75} r={w*0.38} fill="#C084FC"/>
      <Circle cx={tx+cW*0.1} cy={base-cH*0.75} r={w*0.38} fill="#C084FC"/>
      {[[90,'#FF85A1'],[270,'#FF85A1']].map(([a,col],i)=>{
        const p=pol(c,c,rr,a);
        return <HeartG key={i} px={p[0]} py={p[1]} hs={avatarSize*0.18} fill={col}/>;
      })}
    </Svg>
  );
}

// ==========================================================================
//  5. LIQUID SILVER — wavy organic chrome ring
// ==========================================================================
function LiquidSilverFrame({ S, avatarSize, uid }) {
  const c=S/2; const ar=avatarSize/2;
  const ringW=avatarSize*0.155; const rBase=ar+avatarSize*0.05;
  const rOuter=rBase+ringW; const rInner=rBase;
  const waves=8; const amp=avatarSize*0.038; const N=80;
  const g1=uid+'-ls1'; const g2=uid+'-ls2';
  const outerPts=Array.from({length:N},(_,i)=>{const p=pol(c,c,rOuter+Math.sin((i/N)*waves*Math.PI*2)*amp,(i/N)*360);return p[0]+','+p[1];});
  const innerPts=Array.from({length:N},(_,i)=>{const ri=N-1-i;const p=pol(c,c,rInner+Math.sin((ri/N)*waves*Math.PI*2+Math.PI)*amp*0.55,(ri/N)*360);return p[0]+','+p[1];});
  const outerPath=outerPts.map((p,i)=>(i===0?'M':'L')+p).join(' ')+' Z';
  const innerPath=innerPts.map((p,i)=>(i===0?'M':'L')+p).join(' ')+' Z';
  return(
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"    stopColor="#F2F2F6"/><Stop offset="0.22" stopColor="#B0B8C8"/>
          <Stop offset="0.5"  stopColor="#E8E8F2"/><Stop offset="0.78" stopColor="#848898"/>
          <Stop offset="1"    stopColor="#D4D4E4"/>
        </LinearGradient>
        <LinearGradient id={g2} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="rgba(255,255,255,0.72)"/><Stop offset="1" stopColor="rgba(255,255,255,0)"/>
        </LinearGradient>
      </Defs>
      <Path d={outerPath+' '+innerPath} fillRule="evenodd" fill={'url(#'+g1+')'}/>
      <Path d={outerPath+' '+innerPath} fillRule="evenodd" fill={'url(#'+g2+')'}/>
    </Svg>
  );
}

// ==========================================================================
//  6. AMETHYST CRYSTAL — purple jagged facet ring
// ==========================================================================
function AmethystFrame({ S, avatarSize, uid }) {
  const c=S/2; const {w,rr}=ringGeo(S,avatarSize,0.10);
  const g1=uid+'-am1'; const N=16; const cH=w*2.05; const halfAng=180/N;
  return(
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E040FB"/><Stop offset="0.48" stopColor="#7B1FA2"/><Stop offset="1" stopColor="#4A148C"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#CE93D8" strokeWidth={w*2.8} strokeOpacity={0.18}/>
      {Array.from({length:N},(_,i)=>{
        const angle=(i/N)*360;
        const b1=pol(c,c,rr-w*0.42,angle-halfAng*0.85); const b2=pol(c,c,rr-w*0.42,angle+halfAng*0.85);
        const tp=pol(c,c,rr+cH,angle); const hp=pol(c,c,rr+cH*0.42,angle-halfAng*0.3);
        return(<G key={i}>
          <Polygon points={b1[0]+','+b1[1]+' '+b2[0]+','+b2[1]+' '+tp[0]+','+tp[1]} fill={'url(#'+g1+')'} stroke="#CE93D8" strokeWidth={0.55}/>
          <Polygon points={b1[0]+','+b1[1]+' '+hp[0]+','+hp[1]+' '+tp[0]+','+tp[1]} fill="rgba(255,255,255,0.20)"/>
        </G>);
      })}
      <Circle cx={c} cy={c} r={rr-w*0.4} fill="none" stroke="#7B1FA2" strokeWidth={w*0.82}/>
    </Svg>
  );
}
//  FRAME LIST
// ==========================================================================
//  MALE FRAMES — 5 designs
// ==========================================================================

// 1. STEEL — metallic silver-blue ring with rivet dots
function SteelFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.085);
  const g = uid+'-stl';
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B0C4D8"/><Stop offset="0.3" stopColor="#6E8BA0"/>
          <Stop offset="0.65" stopColor="#C8D8E8"/><Stop offset="1" stopColor="#7890A0"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#8090A0" strokeWidth={w*3.0} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      <Circle cx={c} cy={c} r={rr+w*0.78} fill="none" stroke="#C8D8E8" strokeWidth={w*0.22}/>
      <Circle cx={c} cy={c} r={rr-w*0.78} fill="none" stroke="#4A6070" strokeWidth={w*0.22}/>
      {[0,60,120,180,240,300].map((a,i)=>{
        const p=pol(c,c,rr,a);
        return <G key={i}>
          <Circle cx={p[0]} cy={p[1]} r={w*0.62} fill="#5A7080" stroke="#C8D8E8" strokeWidth={0.6}/>
          <Circle cx={p[0]-w*0.18} cy={p[1]-w*0.18} r={w*0.18} fill="rgba(255,255,255,0.45)"/>
        </G>;
      })}
    </Svg>
  );
}

// 2. DRAGON — dark crimson ring with scale tiles
function DragonFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-drg';
  const N = 18;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B0000"/><Stop offset="0.4" stopColor="#CC2200"/>
          <Stop offset="0.7" stopColor="#FF4400"/><Stop offset="1" stopColor="#8B0000"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#CC2200" strokeWidth={w*3.5} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      {Array.from({length:N},(_,i)=>{
        const a=(i/N)*360; const p=pol(c,c,rr,a);
        return <Ellipse key={i} cx={p[0]} cy={p[1]} rx={w*0.58} ry={w*0.4}
          fill={i%3===0?'#FF2200':'#8B0000'} stroke="#FF4400" strokeWidth={0.4} opacity={0.88}
          transform={`rotate(${a} ${p[0]} ${p[1]})`}/>;
      })}
      <Circle cx={c} cy={c} r={rr-w*0.82} fill="none" stroke="#FF2200" strokeWidth={w*0.25} strokeOpacity={0.6}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FF6600" strokeWidth={w*3.5} strokeOpacity={0.06}/>
    </Svg>
  );
}

// 3. CARBON — dark carbon-fiber textured ring
function CarbonFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-cbn';
  const N = 22;
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A2A2A"/><Stop offset="0.35" stopColor="#424242"/>
          <Stop offset="0.65" stopColor="#1A1A1A"/><Stop offset="1" stopColor="#3A3A3A"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#1A1A1A" strokeWidth={w*3.5} strokeOpacity={0.45}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w*1.1}/>
      {Array.from({length:N},(_,i)=>{
        const a=(i/N)*360; const p=pol(c,c,rr,a);
        return <Rect key={i}
          x={p[0]-w*0.28} y={p[1]-w*0.2} width={w*0.56} height={w*0.4}
          fill={i%2===0?'#585858':'#1E1E1E'} opacity={0.9}
          transform={`rotate(${a} ${p[0]} ${p[1]})`}/>;
      })}
      <Circle cx={c} cy={c} r={rr+w*0.78} fill="none" stroke="#505050" strokeWidth={w*0.2}/>
      <Circle cx={c} cy={c} r={rr-w*0.78} fill="none" stroke="#404040" strokeWidth={w*0.2}/>
    </Svg>
  );
}

// 4. THUNDER — electric blue ring with lightning bolts
function ThunderFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-thr';
  const BoltShape = ({ cx, cy, angle, sz }) => {
    const pts = [
      [cx, cy-sz],[cx+sz*0.38,cy],[cx+sz*0.12,cy],
      [cx+sz*0.12,cy+sz],[cx-sz*0.12,cy],[cx-sz*0.38,cy],[cx,cy-sz],
    ].map(p=>p.join(',')).join(' ');
    return <Polygon points={pts} fill="#FFD700"
      transform={`rotate(${angle} ${cx} ${cy})`} opacity={0.95}/>;
  };
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1A3AFF"/><Stop offset="0.5" stopColor="#00A8FF"/>
          <Stop offset="1" stopColor="#1A3AFF"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#1A3AFF" strokeWidth={w*3.5} strokeOpacity={0.18}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#FFD700" strokeWidth={w*3.0} strokeOpacity={0.08}/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke={'url(#'+g+')'} strokeWidth={w}/>
      {[0,90,180,270].map((a,i)=>{const p=pol(c,c,rr,a);return <BoltShape key={i} cx={p[0]} cy={p[1]} angle={a} sz={w*0.88}/>;}) }
      {[45,135,225,315].map((a,i)=>{const p=pol(c,c,rr,a);return <Circle key={i} cx={p[0]} cy={p[1]} r={w*0.36} fill="#00A8FF" opacity={0.88}/>;}) }
    </Svg>
  );
}

// 5. WARRIOR — dark bronze spiked ring
function WarriorFrame({ S, avatarSize, uid }) {
  const { c, w, rr } = ringGeo(S, avatarSize, 0.09);
  const g = uid+'-war';
  const N = 14;
  const r2 = rr + w*1.05; const r1 = rr + w*0.45; const r3 = rr - w*0.45;
  const outerPts = Array.from({length:N*2},(_,i)=>{
    const p=pol(c,c,i%2===0?r2:r1,(i/(N*2))*360); return `${p[0]},${p[1]}`;
  }).join(' ');
  const innerPts = Array.from({length:N*2},(_,i)=>{
    const p=pol(c,c,i%2===0?r3-w*0.08:r3+w*0.08,(i/(N*2))*360); return `${p[0]},${p[1]}`;
  }).join(' ');
  return (
    <Svg width={S} height={S}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B6914"/><Stop offset="0.4" stopColor="#C9A227"/>
          <Stop offset="0.7" stopColor="#8B6914"/><Stop offset="1" stopColor="#A07820"/>
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#C9A227" strokeWidth={w*3.0} strokeOpacity={0.14}/>
      <Polygon points={outerPts} fill={'url(#'+g+')'} stroke="#E8C040" strokeWidth={0.6} strokeLinejoin="miter"/>
      <Polygon points={innerPts} fill="none" stroke="#8B6914" strokeWidth={w*0.22} strokeLinejoin="miter"/>
      <Circle cx={c} cy={c} r={rr} fill="none" stroke="#E8C040" strokeWidth={w*0.28} strokeOpacity={0.5}/>
    </Svg>
  );
}

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

  // ── VIP Premium Frames ────────────────────────────────────────
  { id: 'baroque',   label: 'Baroque',    padRatio: 0.28, Render: OrnateGoldFrame },
  { id: 'circuit',   label: 'Circuit',    padRatio: 0.18, Render: CircuitFrame },
  { id: 'bling',     label: 'Bling',      padRatio: 0.18, Render: CrystalBlingFrame },
  { id: 'liquid',    label: 'Liquid',     padRatio: 0.18, Render: LiquidSilverFrame },
  { id: 'amethyst',  label: 'Amethyst',   padRatio: 0.22, Render: AmethystFrame },

  // ── Female / Lady Frames ──────────────────────────────────────
  { id: 'rosegold',   label: 'Rose Gold',  padRatio: 0.18, for: 'female', Render: RoseGoldFrame },
  { id: 'sakura',     label: 'Sakura',     padRatio: 0.22, for: 'female', Render: SakuraFrame },
  { id: 'mermaid',    label: 'Mermaid',    padRatio: 0.20, for: 'female', Render: MermaidFrame },
  { id: 'candy',      label: 'Candy',      padRatio: 0.20, for: 'female', Render: CandyPastelFrame },
  { id: 'aurora',     label: 'Aurora',     padRatio: 0.22, for: 'female', Render: AuroraFrame },
  { id: 'pearl',      label: 'Pearl',      padRatio: 0.20, for: 'female', Render: PearlBeadsFrame },
  { id: 'butterfly',  label: 'Butterfly',  padRatio: 0.22, for: 'female', Render: ButterflyFrame },
  { id: 'glam',       label: 'Glam',       padRatio: 0.22, for: 'female', Render: GlamFrame },
  { id: 'floral',     label: 'Floral',     padRatio: 0.24, for: 'female', Render: FloralVineFrame },
  { id: 'princess',   label: 'Princess',   padRatio: 0.26, for: 'female', Render: PrincessFrame },

  // ── Male Frames ───────────────────────────────────────────────
  { id: 'steel',    label: 'Steel',    padRatio: 0.18, for: 'male', Render: SteelFrame },
  { id: 'dragon',   label: 'Dragon',   padRatio: 0.20, for: 'male', Render: DragonFrame },
  { id: 'carbon',   label: 'Carbon',   padRatio: 0.20, for: 'male', Render: CarbonFrame },
  { id: 'thunder',  label: 'Thunder',  padRatio: 0.22, for: 'male', Render: ThunderFrame },
  { id: 'warrior',  label: 'Warrior',  padRatio: 0.22, for: 'male', Render: WarriorFrame },
];

export const getFrame = (id) => FRAMES.find(f => f.id === id) || FRAMES[0];

// Returns frames appropriate for a given gender
export function framesForGender(gender) {
  return FRAMES.filter(f => !f.for || f.for === 'all' || f.for === gender);
}
