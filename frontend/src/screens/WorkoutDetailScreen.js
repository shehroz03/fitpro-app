import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, Alert, Modal, SafeAreaView,
} from 'react-native';
import Svg, {
  Path, Ellipse, Circle, Line, G, Defs,
  RadialGradient, LinearGradient, Stop,
  Text as SvgText,
} from 'react-native-svg';
import { workoutAPI } from '../api/services';
import { C } from '../utils/theme';
import { Video, ResizeMode } from 'expo-av';

const EXERCISE_DATA = {
  'Running':           { sets:1,  reps:0,  rest:0,   move:'run',      muscle:'Full Body · Cardio',           tips:['Land midfoot','Arms at 90°','Shoulders relaxed','Breathe rhythmically'] },
  'Barbell Squat':     { sets:4,  reps:12, rest:90,  move:'squat',    muscle:'Quads · Glutes · Core',        tips:['Feet shoulder-width','Chest up','Knees track toes','Go to parallel'] },
  'Bench Press':       { sets:4,  reps:10, rest:90,  move:'press',    muscle:'Chest · Triceps · Shoulders',  tips:['Grip wider than shoulders','Bar to mid-chest','Feet flat','Slight arch'] },
  'Pull-ups':          { sets:3,  reps:10, rest:90,  move:'pullup',   muscle:'Back · Biceps · Core',         tips:['Dead hang start','Pull elbows down','Chin over bar','Control descent'] },
  'Deadlift':          { sets:3,  reps:8,  rest:120, move:'deadlift', muscle:'Hamstrings · Glutes · Back',   tips:['Bar over mid-foot','Hip hinge','Bar close to body','Drive hips at top'] },
  'Shoulder Press':    { sets:3,  reps:12, rest:60,  move:'press',    muscle:'Shoulders · Triceps',          tips:['Core tight','Press overhead','No elbow flare','Lower to chin'] },
  'Lunges':            { sets:3,  reps:12, rest:60,  move:'lunge',    muscle:'Quads · Glutes · Balance',     tips:['Step forward wide','Front knee 90°','Back knee near floor','Drive through heel'] },
  'Burpees':           { sets:4,  reps:15, rest:60,  move:'burpee',   muscle:'Full Body · HIIT',             tips:['Explosive jump','Land softly','Core tight','Breathe rhythm'] },
  'Leg Raises':        { sets:5,  reps:10, rest:60,  move:'legraise', muscle:'Lower Abs · Hip Flexors',      tips:['Back flat on floor','Legs straight','Lower slowly','No momentum'] },
  'Push-ups':          { sets:5,  reps:20, rest:45,  move:'pushup',   muscle:'Chest · Shoulders · Triceps',  tips:['Hands shoulder-width','Body straight','Chest to floor','Elbows 45°'] },
  'Russian Twists':    { sets:3,  reps:20, rest:45,  move:'twist',    muscle:'Obliques · Core',              tips:['Lean back 45°','Feet elevated','Rotate from core','Controlled'] },
  'Mountain Climbers': { sets:4,  reps:20, rest:45,  move:'climb',    muscle:'Core · Shoulders · Cardio',   tips:['Hips level','Drive knees fast','Arms extended','Breathe continuously'] },
};
const DEF = { sets:3, reps:12, rest:60, move:'squat', muscle:'Full Body', tips:['Form first','Control movement','Breathe properly','Stay consistent'] };
const SPD = { run:520,squat:1000,press:1100,pullup:1500,deadlift:1200,lunge:900,burpee:650,legraise:1200,twist:750,pushup:900,climb:520 };

const VIDEOS = {
  male: {
    run: require('../../assets/videos/Man_running_in_place_202606091438.mp4'),
    squat: require('../../assets/videos/Man_performing_bodyweight_squat_202606091438.mp4'),
    press: require('../../assets/videos/Man_performing_shoulder_press_202606091438.mp4'),
    pullup: require('../../assets/videos/Man_performs_one_pull-up_202606091438.mp4'),
    lunge: require('../../assets/videos/Man_performing_forward_lunge_202606091438.mp4'),
    burpee: require('../../assets/videos/Man_performs_one_burpee_202606091438.mp4'),
    twist: require('../../assets/videos/Man_performing_Russian_twists_202606091438.mp4'),
    pushup: require('../../assets/videos/Man_performs_one_push-up_202606091438.mp4')
  },
  female: {
    run: require('../../assets/videos/Woman_running_in_place_202606091438.mp4'),
    squat: require('../../assets/videos/Woman_performing_bodyweight_squat_202606091438.mp4'),
    press: require('../../assets/videos/Woman_performing_dumbbell_press_202606091438.mp4'),
    pullup: require('../../assets/videos/Woman_performs_one_pull-up_202606091438.mp4'),
    lunge: require('../../assets/videos/Woman_performs_forward_lunge_202606091438.mp4'),
    burpee: require('../../assets/videos/Woman_performs_one_burpee_202606091438.mp4'),
    twist: require('../../assets/videos/Woman_performing_Russian_twists_202606091438.mp4'),
    pushup: require('../../assets/videos/Woman_performing_push-up_202606091712.mp4')
  }
};

function getSkin(gender) {
  if (gender === 'female') return {
    base:'#D4956A', mid:'#C4825A', dark:'#A86845', light:'#E8AA82',
    hi:'rgba(255,200,160,.35)', shadow:'rgba(100,50,20,.4)',
    hair:'#3A2010', suit:'#222233', suit2:'#333344', lip:'#C06060', eye:'#3A2A18',
  };
  return {
    base:'#C8845A', mid:'#B87248', dark:'#9A5C38', light:'#DFA070',
    hi:'rgba(240,180,130,.3)', shadow:'rgba(80,40,10,.45)',
    hair:'#2A1A08', suit:'#1A1A2A', suit2:'#252535', lip:'#B06050', eye:'#2A1E14',
  };
}

function getPose(move, t) {
  const P = {
    run:      { rY:168, ln:-10,hd:-7,  aLu:-50+t*72,aLe:-28+t*36,aRu:18-t*72,aRe:16-t*36,lLf:28+t*44,lLk:-6-t*52,lRf:-36+t*44,lRk:-6+t*52 },
    squat:    { rY:185+t*26,ln:t*11,hd:0, aLu:20+t*16,aLe:t*20,aRu:-20-t*16,aRe:t*20,lLf:36+t*26,lLk:-52-t*20,lRf:-36-t*26,lRk:-52-t*20 },
    press:    { rY:168, ln:0,hd:5,    aLu:-(88+t*34),aLe:t*18,aRu:88+t*34,aRe:t*18,lLf:5,lLk:0,lRf:-5,lRk:0 },
    pullup:   { rY:166-t*18,ln:0,hd:12, aLu:-(134+t*16),aLe:t*10,aRu:134+t*16,aRe:t*10,lLf:7+t*20,lLk:-t*30,lRf:-7-t*20,lRk:-t*30 },
    deadlift: { rY:176, ln:40*t,hd:-20*t, aLu:9-t*5,aLe:t*5,aRu:-9+t*5,aRe:t*5,lLf:7+t*18,lLk:-t*30,lRf:-7-t*18,lRk:-t*30 },
    lunge:    { rY:180+t*16,ln:5,hd:0, aLu:-13+t*10,aLe:0,aRu:13-t*10,aRe:0,lLf:46+t*10,lLk:-65-t*13,lRf:-13-t*4,lRk:-t*11 },
    burpee:   { rY:186+t*28,ln:28*t,hd:-9*t, aLu:9-t*9,aLe:0,aRu:-9+t*9,aRe:0,lLf:-16-t*60,lLk:t*80,lRf:-16-t*50,lRk:t*70 },
    legraise: { rY:195, ln:-85+t*5,hd:20-t*5, aLu:-5,aLe:0,aRu:5,aRe:0,lLf:-(75+t*10),lLk:t*15,lRf:-(80+t*10),lRk:t*15 },
    twist:    { rY:175, ln:-26+t*52,hd:-26+t*52, aLu:-(40-t*80),aLe:0,aRu:40-t*80,aRe:0,lLf:28,lLk:-52,lRf:-28,lRk:-52 },
    pushup:   { rY:195, ln:-15+t*8,hd:-20+t*15, aLu:-(30-t*25),aLe:-20+t*15,aRu:-(35-t*25),aRe:-20+t*15,lLf:4,lLk:0,lRf:-4,lRk:0 },
    climb:    { rY:180+t*8,ln:-16,hd:-5, aLu:-(75-t*30),aLe:-20,aRu:-(16+t*20),aRe:8,lLf:-(25+t*20),lLk:t*42,lRf:16+t*28,lRk:-t*32 },
  };
  return P[move] || P.squat;
}

function HumanFigure({ moveType = 'squat', gender = 'male', active = true }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [t, setT] = React.useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setT(value));
    return () => anim.removeListener(id);
  }, []);

  useEffect(() => {
    if (!active) { anim.setValue(0); return; }
    const speed = SPD[moveType] || 900;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue:1, duration:speed, easing:Easing.inOut(Easing.cubic), useNativeDriver:false }),
      Animated.timing(anim, { toValue:0, duration:speed, easing:Easing.inOut(Easing.cubic), useNativeDriver:false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, moveType]);

  const vSrc = VIDEOS[gender]?.[moveType];
  if (vSrc) {
    return (
      <View style={{ width: 200, height: 300, overflow: 'hidden', borderRadius: 14 }}>
        <Video
          source={vSrc}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={active}
          isLooping
          isMuted
        />
        {active && (
          <View style={{position:'absolute',top:10,right:12,flexDirection:'row',alignItems:'center',gap:5,zIndex:2}}>
            <View style={{width:8,height:8,borderRadius:4,backgroundColor:gender==='female'?'#FF6B9D':'#C8F135'}}/>
            <Text style={{color:gender==='female'?'#FF6B9D':'#C8F135',fontSize:9,fontWeight:'900',letterSpacing:1}}>LIVE</Text>
          </View>
        )}
      </View>
    );
  }

  const W=200, H=300, cx=W/2, isF=gender==='female';
  const SK=getSkin(gender);
  const p=getPose(moveType,t);
  const fv=v=>parseFloat(v.toFixed(2));
  const R=(px,py,ox,oy,deg)=>{ const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r),dx=px-ox,dy=py-oy; return{x:ox+dx*c-dy*s,y:oy+dx*s+dy*c}; };

  const SHW=isF?36:50,HPW=isF?38:33,WSW=isF?22:28;
  const TH=62,NW=isF?7:10,NH=13,HRX=isF?17:20,HRY=isF?21:23;
  const ARM=48,FORE=42,AW=isF?10:15,FW=isF?7.5:11;
  const THG=65,SHN=62,TWG=isF?17:22,SWG=isF?11:14;

  const rootX=cx, rootY=(p.rY||178)+(H-290)*0.5, lean=p.ln||0;
  const sL=R(rootX-SHW,rootY-TH,rootX,rootY,lean), sR=R(rootX+SHW,rootY-TH,rootX,rootY,lean);
  const wL=R(rootX-WSW,rootY-TH*.32,rootX,rootY,lean), wR=R(rootX+WSW,rootY-TH*.32,rootX,rootY,lean);
  const hpL={x:rootX-HPW,y:rootY}, hpR={x:rootX+HPW,y:rootY};
  const nkB=R(rootX,rootY-TH+5,rootX,rootY,lean), nkT=R(rootX,rootY-TH-NH,rootX,rootY,lean);
  const hdC=R(rootX,rootY-TH-NH-HRY+5,rootX,rootY,lean), scT=R(rootX,rootY-TH,rootX,rootY,lean);
  const eL=R(sL.x,sL.y+ARM,sL.x,sL.y,p.aLu||0), hL=R(eL.x,eL.y+FORE,eL.x,eL.y,(p.aLe||0)+(p.aLu||0));
  const eR=R(sR.x,sR.y+ARM,sR.x,sR.y,p.aRu||0), hR=R(eR.x,eR.y+FORE,eR.x,eR.y,(p.aRe||0)+(p.aRu||0));
  const kL=R(hpL.x+HPW*.26,hpL.y+THG,hpL.x,hpL.y,p.lLf||0), fL=R(kL.x,kL.y+SHN,kL.x,kL.y,(p.lLk||0)+(p.lLf||0));
  const kR=R(hpR.x-HPW*.26,hpR.y+THG,hpR.x,hpR.y,p.lRf||0), fR=R(kR.x,kR.y+SHN,kR.x,kR.y,(p.lRk||0)+(p.lRf||0));

  const limb=(x1,y1,x2,y2,w1,w2)=>{ w2=w2??w1*.74; const dx=x2-x1,dy=y2-y1,L=Math.sqrt(dx*dx+dy*dy); if(L<.5)return''; const nx=-dy/L,ny=dx/L,mx=(x1+x2)/2,my=(y1+y2)/2; return`M${fv(x1+nx*w1)},${fv(y1+ny*w1)} Q${fv(mx+nx*w1*.2)},${fv(my+ny*w1*.2)} ${fv(x2+nx*w2)},${fv(y2+ny*w2)} L${fv(x2-nx*w2)},${fv(y2-ny*w2)} Q${fv(mx-nx*w1*.2)},${fv(my-ny*w1*.2)} ${fv(x1-nx*w1)},${fv(y1-ny*w1)} Z`; };
  const handP=(ex,ey,ang)=>{ const a=ang*Math.PI/180,fw={x:Math.sin(a),y:Math.cos(a)},pp={x:Math.cos(a),y:-Math.sin(a)},F=[[14,-8],[16,-4],[16,0],[15,4],[11,8]],pts=F.map(([L,o])=>`L${fv(ex+pp.x*o+fw.x*L)},${fv(ey+pp.y*o+fw.y*L)}`); return`M${fv(ex+pp.x*-8)},${fv(ey+pp.y*-8)} ${pts.join(' ')} L${fv(ex+pp.x*8)},${fv(ey+pp.y*8)} Z`; };
  const footP=(kx,ky,fx,fy)=>{ const dx=fx-kx,dy=fy-ky,L=Math.sqrt(dx*dx+dy*dy); if(L<.5)return''; const nx=-dy/L,ny=dx/L; return`M${fv(fx+nx*7)},${fv(fy+ny*7)} L${fv(fx+nx*7+dx/L*20)},${fv(fy+ny*7+dy/L*20+3)} L${fv(fx-nx*7+dx/L*20)},${fv(fy-ny*7+dy/L*20+3)} L${fv(fx-nx*7-dx/L*4)},${fv(fy-ny*7-dy/L*4)} Z`; };

  const torso=`M${fv(sL.x)},${fv(sL.y)} C${fv(sL.x-9)},${fv(sL.y+TH*.22)} ${fv(wL.x-5)},${fv(wL.y)} ${fv(hpL.x)},${fv(hpL.y)} C${fv(hpL.x+5)},${fv(hpL.y+5)} ${fv(hpR.x-5)},${fv(hpR.y+5)} ${fv(hpR.x)},${fv(hpR.y)} C${fv(wR.x+5)},${fv(wR.y)} ${fv(sR.x+9)},${fv(sR.y+TH*.22)} ${fv(sR.x)},${fv(sR.y)} C${fv(sR.x-2)},${fv(scT.y-9)} ${fv(sL.x+2)},${fv(scT.y-9)} ${fv(sL.x)},${fv(sL.y)} Z`;
  const nkPath=`M${fv(nkB.x-NW)},${fv(nkB.y)} Q${fv(nkT.x-NW*1.1)},${fv((nkB.y+nkT.y)/2)} ${fv(nkT.x)},${fv(nkT.y)} Q${fv(nkT.x+NW*1.1)},${fv((nkB.y+nkT.y)/2)} ${fv(nkB.x+NW)},${fv(nkB.y)} Z`;
  const shorts=`M${fv(hpL.x+4)},${fv(hpL.y-4)} C${fv(hpL.x+2)},${fv(hpL.y+22)} ${fv(rootX-8)},${fv(hpL.y+30)} ${fv(rootX-4)},${fv(hpL.y+30)} L${fv(rootX+4)},${fv(hpL.y+30)} C${fv(rootX+8)},${fv(hpL.y+30)} ${fv(hpR.x-2)},${fv(hpR.y+22)} ${fv(hpR.x-4)},${fv(hpR.y-4)} Z`;
  const uid=`h${gender[0]}${moveType.slice(0,2)}`;
  const AC=gender==='female'?'#FF6B9D':'#C8F135';

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id={`${uid}sk`} cx="40%" cy="30%" r="65%"><Stop offset="0%" stopColor={SK.light}/><Stop offset="50%" stopColor={SK.base}/><Stop offset="100%" stopColor={SK.dark}/></RadialGradient>
        <RadialGradient id={`${uid}hd`} cx="38%" cy="30%" r="62%"><Stop offset="0%" stopColor={SK.light}/><Stop offset="45%" stopColor={SK.base}/><Stop offset="100%" stopColor={SK.dark}/></RadialGradient>
        <LinearGradient id={`${uid}ll`} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0%" stopColor={SK.light}/><Stop offset="45%" stopColor={SK.base}/><Stop offset="100%" stopColor={SK.dark}/></LinearGradient>
        <LinearGradient id={`${uid}rl`} x1="100%" y1="0%" x2="0%" y2="0%"><Stop offset="0%" stopColor={SK.light}/><Stop offset="45%" stopColor={SK.base}/><Stop offset="100%" stopColor={SK.dark}/></LinearGradient>
        <RadialGradient id={`${uid}tg`} cx="38%" cy="25%" r="70%"><Stop offset="0%" stopColor={SK.light}/><Stop offset="40%" stopColor={SK.base}/><Stop offset="100%" stopColor={SK.dark}/></RadialGradient>
      </Defs>

      {/* Ground */}
      <Ellipse cx={fv(cx)} cy={fv(H-5)} rx="46" ry="5" fill={SK.shadow} opacity="0.55"/>

      {/* BACK LEG */}
      <Path d={limb(hpL.x+HPW*.08,hpL.y,kL.x,kL.y,TWG,TWG*.70)} fill={`url(#${uid}ll)`}/>
      <Ellipse cx={fv(kL.x)} cy={fv(kL.y)} rx={fv(SWG*1.1)} ry={fv(SWG*1.1)} fill={`url(#${uid}sk)`}/>
      <Path d={limb(kL.x,kL.y,fL.x,fL.y,SWG,SWG*.58)} fill={`url(#${uid}ll)`}/>
      <Path d={footP(kL.x,kL.y,fL.x,fL.y)} fill={SK.suit}/>
      <Ellipse cx={fv(fL.x)} cy={fv(fL.y+3)} rx={fv(SWG*.85)} ry={fv(SWG*.5)} fill="white" opacity="0.6"/>

      {/* BACK ARM */}
      <Path d={limb(sL.x,sL.y,eL.x,eL.y,AW,AW*.72)} fill={`url(#${uid}ll)`}/>
      <Ellipse cx={fv(eL.x)} cy={fv(eL.y)} rx={fv(FW*.9)} ry={fv(FW*.9)} fill={`url(#${uid}sk)`}/>
      <Path d={limb(eL.x,eL.y,hL.x,hL.y,FW,FW*.64)} fill={`url(#${uid}ll)`}/>
      <Path d={handP(hL.x,hL.y,(p.aLu||0)+(p.aLe||0))} fill={SK.dark} opacity="0.82"/>

      {/* TORSO */}
      <Path d={torso} fill={`url(#${uid}tg)`}/>

      {isF ? <>
        <Ellipse cx={fv(sL.x*.25+rootX*.75-5)} cy={fv(sL.y*.22+(rootY-TH*.56)*.78)} rx="13" ry="8.5" fill={SK.mid} opacity="0.55" rotation={fv(lean)} originX={fv(rootX)} originY={fv(rootY)}/>
        <Ellipse cx={fv(sR.x*.25+rootX*.75+5)} cy={fv(sR.y*.22+(rootY-TH*.56)*.78)} rx="13" ry="8.5" fill={SK.mid} opacity="0.55" rotation={fv(lean)} originX={fv(rootX)} originY={fv(rootY)}/>
        <Line x1={fv(rootX-8)} y1={fv(scT.y+5)} x2={fv(rootX-14)} y2={fv(scT.y+TH*.32)} stroke={SK.suit2} strokeWidth="4" strokeLinecap="round"/>
        <Line x1={fv(rootX+8)} y1={fv(scT.y+5)} x2={fv(rootX+14)} y2={fv(scT.y+TH*.32)} stroke={SK.suit2} strokeWidth="4" strokeLinecap="round"/>
      </> : <>
        <Ellipse cx={fv(sL.x*.35+rootX*.65-2)} cy={fv(scT.y+TH*.28)} rx={fv(SHW*.38)} ry={fv(TH*.18)} fill={SK.mid} opacity="0.3" rotation={fv(lean+5)} originX={fv(rootX)} originY={fv(rootY)}/>
        <Ellipse cx={fv(sR.x*.35+rootX*.65+2)} cy={fv(scT.y+TH*.28)} rx={fv(SHW*.38)} ry={fv(TH*.18)} fill={SK.mid} opacity="0.3" rotation={fv(lean-5)} originX={fv(rootX)} originY={fv(rootY)}/>
        <Line x1={fv(scT.x)} y1={fv(scT.y+6)} x2={fv(scT.x)} y2={fv(rootY-TH*.08)} stroke={SK.dark} strokeWidth="1.2" opacity="0.22"/>
        {[0,1,2].map(i=><Line key={i} x1={fv(rootX-SHW*.44)} y1={fv(rootY-TH*.32+i*TH*.12)} x2={fv(rootX+SHW*.44)} y2={fv(rootY-TH*.32+i*TH*.12)} stroke={SK.dark} strokeWidth="1" opacity="0.18"/>)}
      </>}

      <Ellipse cx={fv(sL.x*.18+scT.x*.82)} cy={fv((scT.y+rootY-TH*.48)/2)} rx={fv(SHW*.2)} ry={fv(TH*.17)} fill={SK.hi} rotation={fv(lean)} originX={fv(rootX)} originY={fv(rootY)}/>
      <Path d={nkPath} fill={`url(#${uid}tg)`}/>

      {/* HEAD */}
      <G rotation={fv(p.hd||0)} originX={fv(hdC.x)} originY={fv(hdC.y)}>
        <Ellipse cx={fv(hdC.x)} cy={fv(hdC.y)} rx={fv(HRX)} ry={fv(HRY)} fill={`url(#${uid}hd)`}/>
        <Path d={`M${fv(hdC.x-HRX*.7)},${fv(hdC.y+HRY*.4)} Q${fv(hdC.x)},${fv(hdC.y+HRY*.88)} ${fv(hdC.x+HRX*.7)},${fv(hdC.y+HRY*.4)}`} fill="none" stroke={SK.dark} strokeWidth="1" opacity="0.18"/>
        {/* Eyes */}
        <Ellipse cx={fv(hdC.x-HRX*.34)} cy={fv(hdC.y-HRY*.07)} rx={fv(HRX*.18)} ry={fv(HRY*.12)} fill={SK.eye}/>
        <Ellipse cx={fv(hdC.x+HRX*.34)} cy={fv(hdC.y-HRY*.07)} rx={fv(HRX*.18)} ry={fv(HRY*.12)} fill={SK.eye}/>
        <Ellipse cx={fv(hdC.x-HRX*.36)} cy={fv(hdC.y-HRY*.08)} rx={fv(HRX*.08)} ry={fv(HRY*.06)} fill="white" opacity="0.62"/>
        <Ellipse cx={fv(hdC.x+HRX*.32)} cy={fv(hdC.y-HRY*.08)} rx={fv(HRX*.08)} ry={fv(HRY*.06)} fill="white" opacity="0.62"/>
        {/* Eyebrows */}
        <Path d={`M${fv(hdC.x-HRX*.48)},${fv(hdC.y-HRY*.22)} Q${fv(hdC.x-HRX*.3)},${fv(hdC.y-HRY*.28)} ${fv(hdC.x-HRX*.17)},${fv(hdC.y-HRY*.21)}`} fill="none" stroke={SK.hair} strokeWidth={isF?"1.8":"2.2"} strokeLinecap="round"/>
        <Path d={`M${fv(hdC.x+HRX*.17)},${fv(hdC.y-HRY*.21)} Q${fv(hdC.x+HRX*.3)},${fv(hdC.y-HRY*.28)} ${fv(hdC.x+HRX*.48)},${fv(hdC.y-HRY*.22)}`} fill="none" stroke={SK.hair} strokeWidth={isF?"1.8":"2.2"} strokeLinecap="round"/>
        {/* Nose */}
        <Path d={`M${fv(hdC.x)},${fv(hdC.y-HRY*.08)} L${fv(hdC.x)},${fv(hdC.y+HRY*.2)} Q${fv(hdC.x-HRX*.12)},${fv(hdC.y+HRY*.26)} ${fv(hdC.x)},${fv(hdC.y+HRY*.27)} Q${fv(hdC.x+HRX*.12)},${fv(hdC.y+HRY*.26)} ${fv(hdC.x)},${fv(hdC.y+HRY*.2)}`} fill="none" stroke={SK.dark} strokeWidth="1" opacity="0.32"/>
        {/* Lips */}
        <Path d={`M${fv(hdC.x-HRX*.2)},${fv(hdC.y+HRY*.38)} Q${fv(hdC.x)},${fv(hdC.y+HRY*.34)} ${fv(hdC.x+HRX*.2)},${fv(hdC.y+HRY*.38)}`} fill="none" stroke={SK.lip} strokeWidth={isF?"2.2":"1.8"} strokeLinecap="round"/>
        {isF&&<Path d={`M${fv(hdC.x-HRX*.2)},${fv(hdC.y+HRY*.38)} Q${fv(hdC.x)},${fv(hdC.y+HRY*.46)} ${fv(hdC.x+HRX*.2)},${fv(hdC.y+HRY*.38)}`} fill={SK.lip} opacity="0.38"/>}
        {/* Hair */}
        {isF ? <>
          <Ellipse cx={fv(hdC.x)} cy={fv(hdC.y-HRY*.68)} rx={fv(HRX*.88)} ry={fv(HRY*.44)} fill={SK.hair}/>
          <Path d={`M${fv(hdC.x+HRX*.6)},${fv(hdC.y-HRY*.38)} Q${fv(hdC.x+HRX*1.35)},${fv(hdC.y+HRY*.2)} ${fv(hdC.x+HRX*.78)},${fv(hdC.y+HRY*.78)}`} fill="none" stroke={SK.hair} strokeWidth="5" strokeLinecap="round"/>
        </> : <>
          <Path d={`M${fv(hdC.x-HRX*.88)},${fv(hdC.y-HRY*.18)} Q${fv(hdC.x)},${fv(hdC.y-HRY*1.0)} ${fv(hdC.x+HRX*.88)},${fv(hdC.y-HRY*.18)}`} fill={SK.hair}/>
          <Ellipse cx={fv(hdC.x-HRX*.9)} cy={fv(hdC.y+HRY*.06)} rx={fv(HRX*.13)} ry={fv(HRY*.17)} fill={SK.base}/>
          <Ellipse cx={fv(hdC.x+HRX*.9)} cy={fv(hdC.y+HRY*.06)} rx={fv(HRX*.13)} ry={fv(HRY*.17)} fill={SK.base}/>
        </>}
        <Ellipse cx={fv(hdC.x-HRX*.26)} cy={fv(hdC.y-HRY*.3)} rx={fv(HRX*.27)} ry={fv(HRY*.19)} fill={SK.hi} rotation="-22" originX={fv(hdC.x-HRX*.26)} originY={fv(hdC.y-HRY*.3)}/>
      </G>

      {/* SHOULDERS */}
      <Ellipse cx={fv(sL.x)} cy={fv(sL.y)} rx={fv(isF?9:12)} ry={fv(isF?9:12)} fill={`url(#${uid}sk)`}/>
      <Ellipse cx={fv(sL.x-2)} cy={fv(sL.y-3)} rx="4" ry="3" fill={SK.hi} opacity="0.42"/>
      <Ellipse cx={fv(sR.x)} cy={fv(sR.y)} rx={fv(isF?9:12)} ry={fv(isF?9:12)} fill={`url(#${uid}sk)`}/>
      <Ellipse cx={fv(sR.x-2)} cy={fv(sR.y-3)} rx="4" ry="3" fill={SK.hi} opacity="0.42"/>

      {/* FRONT ARM */}
      <Path d={limb(sR.x,sR.y,eR.x,eR.y,AW,AW*.72)} fill={`url(#${uid}rl)`}/>
      <Path d={limb(sR.x,sR.y,eR.x,eR.y,AW*.35,AW*.22)} fill={SK.hi} opacity="0.35"/>
      <Ellipse cx={fv(eR.x)} cy={fv(eR.y)} rx={fv(FW*.9)} ry={fv(FW*.9)} fill={`url(#${uid}sk)`}/>
      <Path d={limb(eR.x,eR.y,hR.x,hR.y,FW,FW*.64)} fill={`url(#${uid}rl)`}/>
      <Path d={handP(hR.x,hR.y,(p.aRu||0)+(p.aRe||0))} fill={SK.base} opacity="0.93"/>

      {/* SHORTS */}
      <Path d={shorts} fill={SK.suit} opacity="0.95"/>
      <Path d={`M${fv(hpL.x+2)},${fv(hpL.y-5)} Q${fv(rootX)},${fv(hpL.y-8)} ${fv(hpR.x-2)},${fv(hpR.y-5)}`} fill="none" stroke={SK.suit2} strokeWidth="4" strokeLinecap="round"/>

      {/* FRONT LEG */}
      <Path d={limb(hpR.x-HPW*.08,hpR.y,kR.x,kR.y,TWG,TWG*.70)} fill={`url(#${uid}rl)`}/>
      <Path d={limb(hpR.x-HPW*.08,hpR.y,kR.x,kR.y,TWG*.35,TWG*.22)} fill={SK.hi} opacity="0.3"/>
      <Ellipse cx={fv(kR.x)} cy={fv(kR.y)} rx={fv(SWG*1.1)} ry={fv(SWG*1.1)} fill={`url(#${uid}sk)`}/>
      <Path d={limb(kR.x,kR.y,fR.x,fR.y,SWG,SWG*.58)} fill={`url(#${uid}rl)`}/>
      <Path d={limb(kR.x,kR.y,fR.x,fR.y,SWG*.32,SWG*.2)} fill={SK.hi} opacity="0.25"/>
      <Path d={footP(kR.x,kR.y,fR.x,fR.y)} fill={SK.suit}/>
      <Ellipse cx={fv(fR.x+3)} cy={fv(fR.y+2)} rx={fv(SWG*.85)} ry={fv(SWG*.5)} fill="white" opacity="0.68"/>

      {/* Hip highlights */}
      <Ellipse cx={fv(hpL.x+9)} cy={fv(hpL.y-4)} rx="8" ry="6" fill={SK.hi} opacity="0.35"/>
      <Ellipse cx={fv(hpR.x-9)} cy={fv(hpR.y-4)} rx="8" ry="6" fill={SK.hi} opacity="0.35"/>

      {/* LIVE badge */}
      {active&&<G><Circle cx={fv(W-14)} cy="13" r="5" fill={AC} opacity="0.9"/><SvgText x={fv(W-8)} y="17" fill={AC} fontSize="8" fontWeight="900" textAnchor="end">LIVE</SvgText></G>}
    </Svg>
  );
}

const RestTimer = ({ seconds, onDone }) => {
  const [left, setLeft] = useState(seconds);
  const prog = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue:0, duration:seconds*1000, easing:Easing.linear, useNativeDriver:false }).start();
    const t = setInterval(()=>setLeft(p=>{if(p<=1){clearInterval(t);onDone();return 0;}return p-1;}),1000);
    return ()=>clearInterval(t);
  }, []);
  const barW=prog.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  const color=left>30?C.teal:left>10?C.accent:C.red;
  return (
    <View style={rt.wrap}>
      <Text style={rt.title}>💤 REST TIME</Text>
      <Text style={[rt.num,{color}]}>{left}s</Text>
      <View style={rt.barBg}><Animated.View style={[rt.barFill,{width:barW,backgroundColor:color}]}/></View>
      <TouchableOpacity style={rt.skipBtn} onPress={onDone}><Text style={rt.skipTxt}>Skip Rest →</Text></TouchableOpacity>
    </View>
  );
};
const rt=StyleSheet.create({wrap:{alignItems:'center',paddingVertical:20},title:{color:C.muted,fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:8},num:{fontSize:56,fontWeight:'900',marginBottom:12},barBg:{width:'100%',height:6,backgroundColor:C.border,borderRadius:3,overflow:'hidden',marginBottom:16},barFill:{height:'100%',borderRadius:3},skipBtn:{backgroundColor:C.border,borderRadius:10,paddingHorizontal:20,paddingVertical:8},skipTxt:{color:C.muted,fontWeight:'700',fontSize:13}});

export default function WorkoutDetailScreen({ route, navigation }) {
  const { plan } = route.params;
  const [gender,setGender]=useState('male');
  const [phase,setPhase]=useState('overview');
  const [exIdx,setExIdx]=useState(0);
  const [setNum,setSetNum]=useState(1);
  const [setsDone,setSetsDone]=useState([]);
  const [isResting,setIsResting]=useState(false);
  const [isActive,setIsActive]=useState(false);
  const [repCount,setRepCount]=useState(0);
  const [totalTime,setTotalTime]=useState(0);
  const [logging,setLogging]=useState(false);
  const [showTips,setShowTips]=useState(false);
  const timerRef=useRef(null);
  const repAnim=useRef(new Animated.Value(1)).current;
  const progressAnim=useRef(new Animated.Value(0)).current;

  const exList=(plan.exercises||[]).map((e,i)=>typeof e==='string'?{id:e,name:e}:e);
  const exercises=exList.length>0?exList.map((e,i)=>{const name=e.name||`Exercise ${i+1}`;const data=EXERCISE_DATA[name]||{...DEF,move:['squat','press','pullup','burpee','twist','pushup'][i%6]};return{id:e.id||`e${i}`,name,...data};}):Object.entries(EXERCISE_DATA).slice(0,5).map(([name,data],i)=>({id:`e${i}`,name,...data}));
  const curEx=exercises[exIdx]||exercises[0]||DEF;
  const totalSets=exercises.reduce((s,e)=>s+(e.sets||3),0);
  const doneSets=setsDone.length;
  const accentColor=gender==='female'?'#FF6B9D':C.accent;

  useEffect(()=>{if(phase!=='workout')return;timerRef.current=setInterval(()=>setTotalTime(p=>p+1),1000);return()=>clearInterval(timerRef.current);},[phase]);
  useEffect(()=>{Animated.timing(progressAnim,{toValue:totalSets>0?doneSets/totalSets:0,duration:400,useNativeDriver:false}).start();},[doneSets]);

  const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const handleStartSet=()=>{setIsActive(true);setRepCount(0);};
  const handleRepTap=()=>{if(!isActive||isResting)return;Animated.sequence([Animated.spring(repAnim,{toValue:1.5,useNativeDriver:true,speed:60}),Animated.spring(repAnim,{toValue:1,useNativeDriver:true,speed:60})]).start();setRepCount(p=>p+1);};
  const handleCompleteSet=()=>{setSetsDone(p=>[...p,{exIdx,exName:curEx.name,set:setNum,reps:repCount||curEx.reps}]);setIsActive(false);setIsResting(true);};
  const handleRestDone=()=>{setIsResting(false);const n=setNum+1;if(n>curEx.sets){const nx=exIdx+1;if(nx>=exercises.length){setPhase('complete');}else{setExIdx(nx);setSetNum(1);}}else{setSetNum(n);}};
  const handleSave=async()=>{setLogging(true);try{await workoutAPI.logWorkout({plan_id:plan.id,name:plan.name,category:plan.category,started_at:new Date(Date.now()-totalTime*1000).toISOString(),ended_at:new Date().toISOString(),duration_min:Math.round(totalTime/60),calories_burned:plan.calories||Math.round(totalTime/60*8),notes:`${doneSets} sets. ${gender}.`,rating:5});Alert.alert('🎉 Saved!','Workout logged!');}catch{Alert.alert('Note','Could not save — great workout!');}finally{setLogging(false);navigation.goBack();}};

  const progWidth=progressAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']});

  if(phase==='overview') return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.genderRow}>
          {[['male','♂ Male',C.accent],['female','♀ Female','#FF6B9D']].map(([g,lbl,col])=>(
            <TouchableOpacity key={g} style={[s.genderBtn,gender===g&&{borderColor:col,backgroundColor:`${col}18`}]} onPress={()=>setGender(g)}>
              <Text style={[s.genderBtnTxt,gender===g&&{color:col}]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.hero}>
          <View style={s.heroIcon}><Text style={{fontSize:44}}>{plan.icon||'🏋️'}</Text></View>
          <Text style={s.heroTitle}>{plan.name}</Text>
          <View style={s.heroMeta}>
            {[[`${plan.duration_min}m`,'⏱'],[`${plan.calories}kcal`,'🔥'],[plan.difficulty,'📊'],[`${exercises.length}ex`,'💪']].map(([v,i])=>(
              <View key={v} style={s.metaPill}><Text style={{fontSize:13}}>{i}</Text><Text style={s.metaTxt}>{v}</Text></View>
            ))}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.secLabel}>EXERCISES</Text>
          {exercises.map((ex,i)=>(
            <View key={ex.id} style={s.exRow}>
              <View style={s.exNum}><Text style={s.exNumTxt}>{i+1}</Text></View>
              <View style={s.figThumb}><HumanFigure moveType={ex.move||'squat'} gender={gender} active={false}/></View>
              <View style={{flex:1}}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exMeta}>{ex.sets||3} sets × {ex.reps||12} reps</Text>
                <Text style={s.exMuscle}>🎯 {ex.muscle||'Full Body'}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{height:100}}/>
      </ScrollView>
      <View style={s.startWrap}>
        <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor}]} onPress={()=>setPhase('workout')}>
          <Text style={[s.bigBtnTxt,{color:'#000'}]}>▶  START WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if(phase==='complete') return (
    <SafeAreaView style={[s.root,{alignItems:'center',justifyContent:'center',padding:24}]}>
      <Text style={{fontSize:70,marginBottom:12}}>🎉</Text>
      <Text style={[s.heroTitle,{fontSize:24,textAlign:'center',marginBottom:8}]}>WORKOUT COMPLETE!</Text>
      <Text style={{color:C.muted,fontSize:14,textAlign:'center',marginBottom:24}}>Great job finishing {plan.name}!</Text>
      <View style={s.completeStats}>
        {[['⏱',fmtTime(totalTime),'Time'],['✅',`${doneSets}`,'Sets'],['🔥',`~${Math.round(totalTime/60*8)}`,'Kcal']].map(([icon,val,lbl])=>(
          <View key={lbl} style={s.completeStat}><Text style={{fontSize:22,marginBottom:4}}>{icon}</Text><Text style={[s.completeStatVal,{color:accentColor}]}>{val}</Text><Text style={s.completeStatLbl}>{lbl}</Text></View>
        ))}
      </View>
      <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,width:'100%'}]} onPress={handleSave} disabled={logging}>
        <Text style={[s.bigBtnTxt,{color:'#000'}]}>{logging?'Saving...':'💾  SAVE WORKOUT'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.border,marginTop:10,width:'100%'}]} onPress={()=>navigation.goBack()}>
        <Text style={[s.bigBtnTxt,{color:C.text}]}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={()=>Alert.alert('Quit?','End workout?',[{text:'Keep Going',style:'cancel'},{text:'Quit',style:'destructive',onPress:()=>navigation.goBack()}])} style={s.quitBtn}><Text style={s.quitTxt}>✕</Text></TouchableOpacity>
        <View style={{flex:1,marginHorizontal:12}}>
          <View style={s.progBg}><Animated.View style={[s.progFill,{width:progWidth,backgroundColor:accentColor}]}/></View>
          <Text style={s.progTxt}>{doneSets} / {totalSets} sets</Text>
        </View>
        <View style={s.timerBox}><Text style={[s.timerTxt,{color:accentColor}]}>{fmtTime(totalTime)}</Text></View>
      </View>
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:100}} showsVerticalScrollIndicator={false}>
        <View style={s.exHeader}>
          <View style={{flex:1}}>
            <Text style={s.stepLbl}>EXERCISE {exIdx+1} OF {exercises.length}</Text>
            <Text style={s.activeExName}>{curEx.name}</Text>
            <Text style={s.activeMuscle}>🎯 {curEx.muscle}</Text>
          </View>
          <TouchableOpacity style={[s.tipsBtn,{borderColor:accentColor,backgroundColor:`${accentColor}15`}]} onPress={()=>setShowTips(true)}>
            <Text style={[s.tipsBtnTxt,{color:accentColor}]}>💡 Tips</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.figPanel,{borderColor:`${accentColor}35`}]}>
          <View style={[s.figStage,{backgroundColor:'#E8E4DC'}]}>
            <View style={s.setBadge}><Text style={s.setBadgeTxt}>{curEx.sets}×{curEx.reps===0?'∞':curEx.reps}</Text></View>
            <HumanFigure moveType={curEx.move||'squat'} gender={gender} active={isActive}/>
          </View>
          <View style={s.setDots}>
            {Array.from({length:curEx.sets||3}).map((_,i)=>{const done=i<setNum-1,curr=i===setNum-1;return <View key={i} style={[s.dot,done&&{backgroundColor:C.teal,borderColor:C.teal},curr&&{backgroundColor:accentColor,borderColor:accentColor}]}>{done&&<Text style={{fontSize:8,color:'#000'}}>✓</Text>}{curr&&<Text style={{fontSize:8,color:'#000',fontWeight:'900'}}>{setNum}</Text>}</View>;})}
          </View>
          <Text style={s.figStatus}>{isResting?'💤 Resting...':isActive?'💪 Set in progress!':'⚡ Ready!'}</Text>
        </View>

        <View style={s.setCard}>
          <View style={s.setCardRow}>
            {[['SET',`${setNum}/${curEx.sets}`],[curEx.isTime?'TIME':'REPS',`${curEx.reps}${curEx.isTime?'s':''}`],['REST',`${curEx.rest}s`]].map(([lbl,val],i,arr)=>(
              <React.Fragment key={lbl}>
                <View style={s.setInfo}><Text style={s.setInfoLbl}>{lbl}</Text><Text style={[s.setInfoVal,i===0&&{color:accentColor}]}>{val}</Text></View>
                {i<arr.length-1&&<View style={s.setDiv}/>}
              </React.Fragment>
            ))}
          </View>
        </View>

        {isResting?<RestTimer seconds={curEx.rest} onDone={handleRestDone}/>
        :isActive?(<>
          <TouchableOpacity style={[s.repTapZone,{borderColor:accentColor,backgroundColor:`${accentColor}08`}]} onPress={handleRepTap} activeOpacity={0.8}>
            <Animated.View style={{transform:[{scale:repAnim}]}}><Text style={[s.repNum,{color:accentColor}]}>{repCount}</Text></Animated.View>
            <Text style={s.repHint}>tap to count reps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn,{borderColor:C.teal,backgroundColor:'rgba(47,207,160,0.1)'}]} onPress={handleCompleteSet}>
            <Text style={[s.actionBtnTxt,{color:C.teal}]}>✅  Set Complete</Text>
          </TouchableOpacity>
        </>)
        :<TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,marginBottom:10}]} onPress={handleStartSet}><Text style={[s.bigBtnTxt,{color:'#000'}]}>▶  Start Set {setNum}</Text></TouchableOpacity>}

        {setsDone.length>0&&<View style={s.logSec}><Text style={s.secLabel}>COMPLETED</Text>{setsDone.slice(-4).reverse().map((d,i)=><View key={i} style={s.logRow}><Text>✅</Text><Text style={s.logTxt}>{d.exName} — Set {d.set} — {d.reps} reps</Text></View>)}</View>}
      </ScrollView>

      <Modal visible={showTips} transparent animationType="slide">
        <View style={s.tipsModalBg}>
          <View style={s.tipsModalCard}>
            <View style={[s.tipsModalFig,{backgroundColor:'#E8E4DC'}]}><HumanFigure moveType={curEx.move||'squat'} gender={gender} active={true}/></View>
            <Text style={s.tipTitle}>💡 {curEx.name}</Text>
            <Text style={s.tipMuscle}>🎯 {curEx.muscle}</Text>
            {(curEx.tips||[]).map((tip,i)=>(
              <View key={i} style={s.tipRow}><View style={[s.tipBullet,{backgroundColor:accentColor}]}><Text style={{color:'#000',fontSize:10,fontWeight:'900'}}>{i+1}</Text></View><Text style={s.tipTxt}>{tip}</Text></View>
            ))}
            <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,marginTop:16}]} onPress={()=>setShowTips(false)}><Text style={[s.bigBtnTxt,{color:'#000'}]}>Got It! 💪</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  genderRow:{flexDirection:'row',gap:10,padding:16,paddingBottom:8},
  genderBtn:{flex:1,borderRadius:12,borderWidth:1.5,borderColor:C.border,paddingVertical:11,alignItems:'center',backgroundColor:C.card},
  genderBtnTxt:{color:C.muted,fontSize:14,fontWeight:'800'},
  hero:{alignItems:'center',paddingVertical:18,borderBottomWidth:1,borderColor:C.border},
  heroIcon:{width:82,height:82,borderRadius:22,backgroundColor:C.accentDim,alignItems:'center',justifyContent:'center',marginBottom:10},
  heroTitle:{color:C.text,fontSize:22,fontWeight:'900',marginBottom:10},
  heroMeta:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'},
  metaPill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.card,borderRadius:12,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:C.border},
  metaTxt:{color:C.text,fontSize:11,fontWeight:'600',textTransform:'capitalize'},
  section:{padding:16},
  secLabel:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:12,textTransform:'uppercase'},
  exRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:10,marginBottom:10},
  exNum:{width:26,height:26,borderRadius:13,backgroundColor:C.accentDim,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent},
  exNumTxt:{color:C.accent,fontSize:11,fontWeight:'900'},
  figThumb:{transform:[{scale:0.44}],width:88,height:132,marginLeft:-14,marginRight:-18},
  exName:{color:C.text,fontSize:13,fontWeight:'700',marginBottom:2},
  exMeta:{color:C.muted,fontSize:11,marginBottom:2},
  exMuscle:{color:C.dim,fontSize:10},
  startWrap:{padding:16,borderTopWidth:1,borderColor:C.border},
  bigBtn:{borderRadius:16,paddingVertical:16,alignItems:'center'},
  bigBtnTxt:{fontSize:15,fontWeight:'900',letterSpacing:0.5},
  completeStats:{flexDirection:'row',gap:12,marginBottom:22},
  completeStat:{backgroundColor:C.card,borderRadius:16,padding:14,alignItems:'center',flex:1,borderWidth:1,borderColor:C.border},
  completeStatVal:{fontSize:20,fontWeight:'900',marginBottom:2},
  completeStatLbl:{color:C.muted,fontSize:10,textAlign:'center'},
  topBar:{flexDirection:'row',alignItems:'center',padding:12,paddingHorizontal:16,borderBottomWidth:1,borderColor:C.border},
  quitBtn:{width:34,height:34,borderRadius:17,backgroundColor:C.card,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  quitTxt:{color:C.muted,fontSize:14,fontWeight:'700'},
  progBg:{height:5,backgroundColor:C.border,borderRadius:3,overflow:'hidden',marginBottom:3},
  progFill:{height:'100%',borderRadius:3},
  progTxt:{color:C.muted,fontSize:10,textAlign:'center'},
  timerBox:{backgroundColor:C.card,borderRadius:10,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:C.border},
  timerTxt:{fontSize:14,fontWeight:'900'},
  exHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  stepLbl:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:4},
  activeExName:{color:C.text,fontSize:22,fontWeight:'900',marginBottom:4},
  activeMuscle:{color:C.muted,fontSize:12},
  tipsBtn:{borderRadius:10,borderWidth:1,paddingHorizontal:12,paddingVertical:7},
  tipsBtnTxt:{fontSize:12,fontWeight:'700'},
  figPanel:{backgroundColor:C.card,borderRadius:20,borderWidth:1.5,padding:12,marginBottom:14,alignItems:'center'},
  figStage:{width:200,height:300,borderRadius:14,alignItems:'center',justifyContent:'center',marginBottom:10,position:'relative'},
  setBadge:{position:'absolute',top:8,left:10,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,zIndex:10},
  setBadgeTxt:{color:'#fff',fontSize:13,fontWeight:'900'},
  setDots:{flexDirection:'row',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:6},
  dot:{width:28,height:28,borderRadius:14,backgroundColor:C.border,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  figStatus:{color:C.muted,fontSize:12,fontWeight:'600'},
  setCard:{backgroundColor:C.card2,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16,marginBottom:14},
  setCardRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center'},
  setInfo:{alignItems:'center'},
  setInfoLbl:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:4},
  setInfoVal:{color:C.text,fontSize:22,fontWeight:'900'},
  setDiv:{width:1,height:40,backgroundColor:C.border},
  repTapZone:{borderRadius:20,borderWidth:2,padding:26,alignItems:'center',marginBottom:12,borderStyle:'dashed'},
  repNum:{fontSize:72,fontWeight:'900',lineHeight:80},
  repHint:{color:C.muted,fontSize:13,marginTop:4},
  actionBtn:{backgroundColor:C.card,borderRadius:14,paddingVertical:14,alignItems:'center',borderWidth:1,marginBottom:10},
  actionBtnTxt:{fontSize:15,fontWeight:'800'},
  logSec:{marginTop:8},
  logRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:0.5,borderColor:C.border},
  logTxt:{color:C.muted,fontSize:12},
  tipsModalBg:{flex:1,backgroundColor:'rgba(0,0,0,0.78)',justifyContent:'flex-end'},
  tipsModalCard:{backgroundColor:C.card2,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,borderTopWidth:1,borderColor:C.border},
  tipsModalFig:{alignItems:'center',marginBottom:12,borderRadius:16,paddingVertical:6},
  tipTitle:{color:C.text,fontSize:20,fontWeight:'900',marginBottom:4},
  tipMuscle:{color:C.muted,fontSize:13,marginBottom:14},
  tipRow:{flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12},
  tipBullet:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',flexShrink:0},
  tipTxt:{color:C.text,fontSize:14,flex:1,lineHeight:20},
});
