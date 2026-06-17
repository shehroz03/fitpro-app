import React, { useId } from 'react';
import Svg, { Path, Ellipse, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const SHAPE_MULT = { skinny: 0.78, medium: 1.0, toned: 0.88, flabby: 1.38 };

export default function BodySilhouette({
  gender = 'female',
  shape  = 'medium',
  regions = [],
  size   = 300,
  accent = '#C8F135',
  body   = '#2C2C3A',
}) {
  const uid = useId().replace(/:/g, '_');
  const VB_W = 160, VB_H = 340;
  const W = size * (VB_W / VB_H);
  const cx = 80;
  const m = SHAPE_MULT[shape] || 1;

  const base = gender === 'male'
    ? { sh: 43, wa: 28, hi: 32, arm: 13, leg: 21, hRx: 20, hRy: 23 }
    : { sh: 33, wa: 19, hi: 39, arm: 10, leg: 19, hRx: 19, hRy: 22 };

  const sh = base.sh;
  const wa = base.wa * m;
  const hi = base.hi * (shape === 'flabby' ? 1.14 : 1);

  const torso = [
    `M ${cx - sh} 72`,
    `C ${cx - sh - 4} 108, ${cx - wa} 138, ${cx - wa} 168`,
    `C ${cx - wa} 190, ${cx - hi} 200, ${cx - hi} 220`,
    `C ${cx - hi} 233, ${cx - hi * 0.62} 239, ${cx - hi * 0.46} 239`,
    `L ${cx + hi * 0.46} 239`,
    `C ${cx + hi * 0.62} 239, ${cx + hi} 233, ${cx + hi} 220`,
    `C ${cx + hi} 200, ${cx + wa} 190, ${cx + wa} 168`,
    `C ${cx + wa} 138, ${cx + sh + 4} 108, ${cx + sh} 72`,
    `C ${cx + sh * 0.44} 62, ${cx - sh * 0.44} 62, ${cx - sh} 72 Z`,
  ].join(' ');

  // curved arms (elbow bend outward slightly)
  const armL = `M ${cx - sh + 3} 79 C ${cx - sh - 14} 116, ${cx - sh - 22} 162, ${cx - sh - 14} 198`;
  const armR = `M ${cx + sh - 3} 79 C ${cx + sh + 14} 116, ${cx + sh + 22} 162, ${cx + sh + 14} 198`;
  // legs (slightly curved)
  const legL = `M ${cx - hi * 0.43} 238 C ${cx - 18} 262, ${cx - 20} 296, ${cx - 17} 334`;
  const legR = `M ${cx + hi * 0.43} 238 C ${cx + 18} 262, ${cx + 20} 296, ${cx + 17} 334`;

  const has = k => regions.includes(k) || regions.includes('full');
  const gid = `glow_${uid}`;

  return (
    <Svg width={W} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <RadialGradient id={gid} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0"   stopColor={accent} stopOpacity="0.92" />
          <Stop offset="0.6" stopColor={accent} stopOpacity="0.35" />
          <Stop offset="1"   stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* ── legs ── */}
      <Path d={legL} stroke={body} strokeWidth={base.leg} fill="none" strokeLinecap="round" />
      <Path d={legR} stroke={body} strokeWidth={base.leg} fill="none" strokeLinecap="round" />
      {/* feet */}
      <Ellipse cx={cx - 15} cy={336} rx={11} ry={5} fill={body} />
      <Ellipse cx={cx + 15} cy={336} rx={11} ry={5} fill={body} />

      {/* ── arms ── */}
      <Path d={armL} stroke={body} strokeWidth={base.arm} fill="none" strokeLinecap="round" />
      <Path d={armR} stroke={body} strokeWidth={base.arm} fill="none" strokeLinecap="round" />
      {/* hands */}
      <Ellipse cx={cx - sh - 12} cy={200} rx={7} ry={5} fill={body} />
      <Ellipse cx={cx + sh + 12} cy={200} rx={7} ry={5} fill={body} />

      {/* ── torso ── */}
      <Path d={torso} fill={body} />

      {/* neck */}
      <Path d={`M ${cx-8} 57 L ${cx-7} 71 L ${cx+7} 71 L ${cx+8} 57 Z`} fill={body} />

      {/* ── head ── */}
      <Ellipse cx={cx} cy={35} rx={base.hRx} ry={base.hRy} fill={body} />

      {/* ── hair ── */}
      {gender === 'female' ? (
        <G>
          {/* bun top */}
          <Ellipse cx={cx} cy={14} rx={14} ry={9} fill={body} />
          <Ellipse cx={cx} cy={8}  rx={9}  ry={7} fill={body} />
          {/* side strands */}
          <Path d={`M ${cx - base.hRx + 1} 26 C ${cx - base.hRx - 7} 44, ${cx - base.hRx - 6} 56, ${cx - base.hRx - 1} 65`}
            stroke={body} strokeWidth={9} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx + base.hRx - 1} 26 C ${cx + base.hRx + 7} 44, ${cx + base.hRx + 6} 56, ${cx + base.hRx + 1} 65`}
            stroke={body} strokeWidth={9} fill="none" strokeLinecap="round" />
        </G>
      ) : (
        <G>
          {/* short male hair cap */}
          <Path d={`M ${cx - base.hRx} 22 C ${cx - base.hRx} 8, ${cx + base.hRx} 8, ${cx + base.hRx} 22`}
            fill={body} stroke="none" />
          <Ellipse cx={cx} cy={14} rx={base.hRx} ry={6} fill={body} />
        </G>
      )}

      {/* ── glows ── */}
      <G>
        {has('arms') && (
          <>
            <Ellipse cx={cx - sh - 12} cy={142} rx={16} ry={32} fill={`url(#${gid})`} opacity={0.95} />
            <Ellipse cx={cx + sh + 12} cy={142} rx={16} ry={32} fill={`url(#${gid})`} opacity={0.95} />
          </>
        )}
        {has('chest') && (
          <Ellipse cx={cx} cy={108} rx={31} ry={20} fill={`url(#${gid})`} opacity={0.95} />
        )}
        {has('back') && (
          <Ellipse cx={cx} cy={118} rx={33} ry={25} fill={`url(#${gid})`} opacity={0.90} />
        )}
        {has('abs') && (
          <Ellipse cx={cx} cy={162} rx={25} ry={25} fill={`url(#${gid})`} opacity={0.95} />
        )}
        {has('glutes') && (
          <Ellipse cx={cx} cy={219} rx={hi + 3} ry={19} fill={`url(#${gid})`} opacity={0.90} />
        )}
        {has('legs') && (
          <>
            <Ellipse cx={cx - 17} cy={286} rx={18} ry={40} fill={`url(#${gid})`} opacity={0.90} />
            <Ellipse cx={cx + 17} cy={286} rx={18} ry={40} fill={`url(#${gid})`} opacity={0.90} />
          </>
        )}
      </G>
    </Svg>
  );
}
