import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../store/authStore';
import { rf, rs, rw, SCREEN_W } from '../utils/responsive';
import { useC } from '../utils/theme';

const SB = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos';
const videoUrl  = (gender, file) => `${SB}/${gender}/${file}`;
const localPath = (file) => FileSystem.documentDirectory + 'fitcore_videos/' + file;

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONS DATA
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = {
  female: [
    {
      id: 'weight_loss', label: 'Weight Loss', subtitle: 'At Home • No Equipment',
      icon: 'fire', mcIcon: true, color: '#FF6B35',
      videos: [
        { id: 'f_run',   label: 'Running in Place',   file: 'Woman_running_in_place_202606110124.mp4' },
        { id: 'f_jack',  label: 'Jumping Jacks',      file: 'Woman_performing_jumping_jacks_202606110124.mp4' },
        { id: 'f_high',  label: 'High Knees',         file: 'Woman_performing_high_knees_202606110124.mp4' },
        { id: 'f_burp',  label: 'Burpee',             file: 'Woman_performs_one_burpee_202606110124.mp4' },
        { id: 'f_climb', label: 'Mountain Climbers',  file: 'Woman_performing_mountain_climbers_202606110124.mp4' },
        { id: 'f_rope',  label: 'Jump Rope',          file: 'Woman_skipping_jump_rope_202606110124.mp4' },
        { id: 'f_push',  label: 'Push-Up',            file: 'Woman_performing_push-up_202606110124.mp4' },
        { id: 'f_box',   label: 'Box Jump',           file: 'Woman_performs_box_jump_202606110124.mp4' },
      ],
    },
    {
      id: 'cardio', label: 'Cardio', subtitle: 'Fat Burning',
      icon: 'run', mcIcon: true, color: '#4ECDC4',
      videos: [
        { id: 'c_run',   label: 'Running in Place',  file: 'Woman_running_in_place_202606110124.mp4' },
        { id: 'c_rope',  label: 'Jump Rope',         file: 'Woman_skipping_jump_rope_202606110124.mp4' },
        { id: 'c_box',   label: 'Box Jump',          file: 'Woman_performs_box_jump_202606110124.mp4' },
        { id: 'c_high',  label: 'High Knees',        file: 'Woman_performing_high_knees_202606110124.mp4' },
        { id: 'c_burp',  label: 'Burpee',            file: 'Woman_performs_one_burpee_202606110124.mp4' },
        { id: 'c_jack',  label: 'Jumping Jacks',     file: 'Woman_performing_jumping_jacks_202606110124.mp4' },
        { id: 'c_cli',   label: 'Mountain Climbers', file: 'Woman_performing_mountain_climbers_202606110124.mp4' },
      ],
    },
    {
      id: 'abs', label: 'Abs & Core', subtitle: 'Core Strength',
      icon: 'human-handsup', mcIcon: true, color: '#C8F135',
      videos: [
        { id: 'a_plk',   label: 'Forearm Plank',     file: 'Woman_holding_forearm_plank_202606110124.mp4' },
        { id: 'a_plkm',  label: 'Plank on Mat',      file: 'Woman_performing_plank_on_mat_202606172357.mp4' },
        { id: 'a_twist', label: 'Russian Twists',    file: 'Woman_performing_Russian_twists_202606110124.mp4' },
        { id: 'a_vsh',   label: 'V-Shape Hold',      file: 'Woman_doing_V-shape_exercise_202606182201.mp4' },
        { id: 'a_cli',   label: 'Mountain Climbers', file: 'Woman_performing_mountain_climbers_202606110124.mp4' },
      ],
    },
    {
      id: 'chest', label: 'Chest', subtitle: 'Upper Body Push',
      icon: 'arm-flex', mcIcon: true, color: '#F59E0B',
      videos: [
        { id: 'ch_pu',   label: 'Push-Up',           file: 'Woman_performing_push-up_202606110124.mp4' },
        { id: 'ch_inc',  label: 'Incline Push-Up',   file: 'Woman_performing_incline_push-ups_202606172358.mp4' },
        { id: 'ch_dbp',  label: 'Dumbbell Press',    file: 'Woman_performing_dumbbell_press_202606110124.mp4' },
      ],
    },
    {
      id: 'back', label: 'Back', subtitle: 'Upper Body Pull',
      icon: 'weight-lifter', mcIcon: true, color: '#6366F1',
      videos: [
        { id: 'b_lat',  label: 'Lat Pulldown',      file: 'Woman_performing_lat_pulldown_202606172357.mp4' },
        { id: 'b_row',  label: 'Seated Cable Row',  file: 'Woman_performing_seated_cable_row_202606172357.mp4' },
        { id: 'b_pul',  label: 'Pull-Up',           file: 'Woman_performs_one_pull-up_202606110124.mp4' },
        { id: 'b_rdl',  label: 'Romanian Deadlift', file: 'Woman_performing_Romanian_deadlift_202606172357.mp4' },
        { id: 'b_dl',   label: 'Barbell Deadlift',  file: 'Woman_performing_barbell_deadlift_202606110124.mp4' },
        { id: 'b_fp',   label: 'Face Pulls',        file: 'Woman_performing_face_pulls_202606172358.mp4' },
      ],
    },
    {
      id: 'arms', label: 'Arms', subtitle: 'Biceps & Triceps',
      icon: 'arm-flex-outline', mcIcon: true, color: '#EC4899',
      videos: [
        { id: 'ar_curl', label: 'Dumbbell Curl',      file: 'Woman_performing_dumbbell_curl_202606110124.mp4' },
        { id: 'ar_tdip', label: 'Tricep Dip',         file: 'Woman_performing_tricep_dip_202606110124.mp4' },
        { id: 'ar_ext',  label: 'Tricep Extension',   file: 'Woman_performing_dumbbell_extension_202606172358.mp4' },
      ],
    },
    {
      id: 'shoulders', label: 'Shoulders', subtitle: 'Deltoids',
      icon: 'weight-lifter', mcIcon: true, color: '#14B8A6',
      videos: [
        { id: 'sh_sp',  label: 'Dumbbell Press', file: 'Woman_performing_dumbbell_press_202606110124.mp4' },
        { id: 'sh_fp',  label: 'Face Pulls',     file: 'Woman_performing_face_pulls_202606172358.mp4' },
      ],
    },
    {
      id: 'legs', label: 'Legs', subtitle: 'Quads & Hamstrings',
      icon: 'run-fast', mcIcon: true, color: '#EF4444',
      videos: [
        { id: 'l_sq',   label: 'Bodyweight Squat',    file: 'Woman_performing_bodyweight_squat_202606110124.mp4' },
        { id: 'l_bsq',  label: 'Banded Squat',        file: 'Woman_performing_banded_squat_202606172357.mp4' },
        { id: 'l_ssq',  label: 'Sumo Squat',          file: 'Woman_performing_sumo_squat_dumbbell_202606172356.mp4' },
        { id: 'l_bul',  label: 'Bulgarian Split Squat', file: 'Woman_performing_Bulgarian_split_squat_202606172356.mp4' },
        { id: 'l_lun',  label: 'Forward Lunge',       file: 'Woman_performs_forward_lunge_202606110124.mp4' },
        { id: 'l_step', label: 'Dumbbell Step-Ups',   file: 'Woman_performing_dumbbell_step-ups_202606172358.mp4' },
        { id: 'l_lex',  label: 'Leg Extension',       file: 'Woman_performing_leg_extension_machine_202606172357.mp4' },
        { id: 'l_lcurl',label: 'Lying Leg Curl',      file: 'Woman_performing_lying_leg_curl_202606172357.mp4' },
        { id: 'l_box',  label: 'Box Jump',            file: 'Woman_performs_box_jump_202606110124.mp4' },
      ],
    },
    {
      id: 'glutes', label: 'Glutes & Booty', subtitle: 'Glute Activation',
      icon: 'human', mcIcon: true, color: '#A855F7',
      videos: [
        { id: 'g_ht',   label: 'Hip Thrust',         file: 'Woman_performing_barbell_hip_thrust_202606110124.mp4' },
        { id: 'g_gb',   label: 'Glute Bridge',       file: 'Woman_performing_glute_bridge_202606172356.mp4' },
        { id: 'g_dk',   label: 'Donkey Kicks',       file: 'Woman_performing_donkey_kicks_202606172356.mp4' },
        { id: 'g_cgk',  label: 'Cable Kickback',     file: 'Woman_performing_cable_glute_kickback_202606172356.mp4' },
        { id: 'g_fh',   label: 'Fire Hydrant',       file: 'Woman_performing_fire_hydrant_exercise_202606172357.mp4' },
        { id: 'g_ha',   label: 'Hip Abduction',      file: 'Woman_performing_hip_abduction_exercise_202606172358.mp4' },
        { id: 'g_lbw',  label: 'Lateral Band Walk',  file: 'Woman_performing_lateral_band_walks_202606172357.mp4' },
      ],
    },
    {
      id: 'yoga', label: 'Yoga & Flex', subtitle: 'Mind & Body',
      icon: 'yoga', mcIcon: true, color: '#C084FC',
      videos: [
        { id: 'y_cobra', label: 'Cobra Pose',     file: 'Woman_doing_Cobra_Pose_202606182200.mp4' },
        { id: 'y_child', label: "Child's Pose",   file: "Woman_in_Child's_Pose_202606182200.mp4" },
        { id: 'y_dd',    label: 'Downward Dog',   file: 'Woman_holding_downward_dog_pose_202606110124.mp4' },
        { id: 'y_pig',   label: 'Pigeon Pose',    file: 'Woman_performing_Pigeon_Pose_202606182200.mp4' },
        { id: 'y_w2',    label: 'Warrior II',     file: 'Woman_performing_Warrior_II_pose_202606182159.mp4' },
        { id: 'y_tri',   label: 'Triangle Pose',  file: 'Woman_performs_Triangle_Pose_202606182200.mp4' },
        { id: 'y_tree',  label: 'Tree Pose',      file: 'Woman_in_Tree_Pose_202606182200.mp4' },
        { id: 'y_hb',    label: 'Happy Baby',     file: 'Woman_doing_Happy_Baby_Pose_202606182201.mp4' },
        { id: 'y_st',    label: 'Supine Twist',   file: 'Woman_doing_supine_twist_202606182201.mp4' },
        { id: 'y_back',  label: 'Deep Backbend',  file: 'Woman_doing_deep_backbend_202606182201.mp4' },
        { id: 'y_yog',   label: 'Yoga Flow',      file: 'Woman_doing_yoga_poses_202606182200.mp4' },
      ],
    },
    {
      id: 'recovery', label: 'Recovery', subtitle: 'Rest & Restore',
      icon: 'leaf', mcIcon: false, color: '#34D399',
      videos: [
        { id: 'r_foam', label: 'Foam Rolling', file: 'Woman_foam-rolling_thighs_202606110124.mp4' },
      ],
    },
  ],
  male: [
    {
      id: 'weight_loss', label: 'Weight Loss', subtitle: 'At Home • No Equipment',
      icon: 'fire', mcIcon: true, color: '#FF6B35',
      videos: [
        { id: 'm_run',   label: 'Running in Place',  file: 'Man_running_in_place_202606110121.mp4' },
        { id: 'm_jack',  label: 'Jumping Jacks',     file: 'Man_performing_jumping_jacks_202606110121.mp4' },
        { id: 'm_high',  label: 'High Knees',        file: 'Man_performing_high_knees_202606110121.mp4' },
        { id: 'm_burp',  label: 'Burpee',            file: 'Man_performs_one_burpee_202606110121.mp4' },
        { id: 'm_climb', label: 'Mountain Climbers', file: 'Man_performs_mountain_climbers_202606110121.mp4' },
        { id: 'm_rope',  label: 'Jump Rope',         file: 'Man_skipping_jump_rope_202606110121.mp4' },
        { id: 'm_push',  label: 'Push-Up',           file: 'Man_performs_one_push-up_202606110121.mp4' },
        { id: 'm_box',   label: 'Box Jump',          file: 'Man_performs_box_jump_202606110121.mp4' },
      ],
    },
    {
      id: 'cardio', label: 'Cardio', subtitle: 'Fat Burning',
      icon: 'run', mcIcon: true, color: '#4ECDC4',
      videos: [
        { id: 'mc_run',   label: 'Running in Place',  file: 'Man_running_in_place_202606110121.mp4' },
        { id: 'mc_rope',  label: 'Jump Rope',         file: 'Man_skipping_jump_rope_202606110121.mp4' },
        { id: 'mc_box',   label: 'Box Jump',          file: 'Man_performs_box_jump_202606110121.mp4' },
        { id: 'mc_high',  label: 'High Knees',        file: 'Man_performing_high_knees_202606110121.mp4' },
        { id: 'mc_burp',  label: 'Burpee',            file: 'Man_performs_one_burpee_202606110121.mp4' },
        { id: 'mc_jack',  label: 'Jumping Jacks',     file: 'Man_performing_jumping_jacks_202606110121.mp4' },
        { id: 'mc_cli',   label: 'Mountain Climbers', file: 'Man_performs_mountain_climbers_202606110121.mp4' },
        { id: 'mc_brope', label: 'Battle Ropes',      file: 'Man_performing_battle_ropes_202606172359.mp4' },
      ],
    },
    {
      id: 'abs', label: 'Abs & Core', subtitle: 'Core Strength',
      icon: 'human-handsup', mcIcon: true, color: '#C8F135',
      videos: [
        { id: 'ma_plk',   label: 'Forearm Plank',     file: 'Man_holding_forearm_plank_202606110121.mp4' },
        { id: 'ma_twist', label: 'Russian Twists',    file: 'Man_performing_Russian_twists_202606110121.mp4' },
        { id: 'ma_cli',   label: 'Mountain Climbers', file: 'Man_performs_mountain_climbers_202606110121.mp4' },
      ],
    },
    {
      id: 'chest', label: 'Chest', subtitle: 'Upper Body Push',
      icon: 'arm-flex', mcIcon: true, color: '#F59E0B',
      videos: [
        { id: 'mch_pu',   label: 'Push-Up',           file: 'Man_performs_one_push-up_202606110121.mp4' },
        { id: 'mch_inc',  label: 'Incline DB Press',  file: 'Man_performing_incline_dumbbell_press_202606180000.mp4' },
        { id: 'mch_bp',   label: 'Bench Press',       file: 'Man_performs_barbell_bench_press_202606172041.mp4' },
        { id: 'mch_fly',  label: 'Dumbbell Flys',     file: 'Man_performing_dumbbell_flys_202606172358.mp4' },
        { id: 'mch_dip',  label: 'Chest Dips',        file: 'Man_performing_chest_dips_202606172358.mp4' },
      ],
    },
    {
      id: 'back', label: 'Back', subtitle: 'Upper Body Pull',
      icon: 'weight-lifter', mcIcon: true, color: '#6366F1',
      videos: [
        { id: 'mb_pul',  label: 'Pull-Up',           file: 'Man_performs_one_pull-up_202606110121.mp4' },
        { id: 'mb_row',  label: 'Bent-Over Row',     file: 'Man_performing_bent-over_row_202606180000.mp4' },
        { id: 'mb_lat',  label: 'Lat Pulldown',      file: 'Man_performing_lat_pulldown_202606172359.mp4' },
        { id: 'mb_dl',   label: 'Barbell Deadlift',  file: 'Man_performing_barbell_deadlift_202606110121.mp4' },
        { id: 'mb_rdl',  label: 'Romanian Deadlift', file: 'Man_performing_Romanian_deadlift_202606172359.mp4' },
        { id: 'mb_fp',   label: 'Face Pulls',        file: 'Man_performing_face_pulls_202606172358.mp4' },
      ],
    },
    {
      id: 'arms', label: 'Arms', subtitle: 'Biceps & Triceps',
      icon: 'arm-flex-outline', mcIcon: true, color: '#EC4899',
      videos: [
        { id: 'mar_curl', label: 'Dumbbell Curl',    file: 'Man_performing_dumbbell_curl_202606110121.mp4' },
        { id: 'mar_hc',   label: 'Hammer Curls',     file: 'Man_performing_hammer_curls_202606172359.mp4' },
        { id: 'mar_cpd',  label: 'Cable Pushdown',   file: 'Man_performing_cable_pushdown_202606180000.mp4' },
        { id: 'mar_tdip', label: 'Tricep Dip',       file: 'Man_performing_tricep_dip_202606110121.mp4' },
      ],
    },
    {
      id: 'shoulders', label: 'Shoulders', subtitle: 'Deltoids',
      icon: 'weight-lifter', mcIcon: true, color: '#14B8A6',
      videos: [
        { id: 'msh_sp',  label: 'Shoulder Press', file: 'Man_performing_shoulder_press_202606110121.mp4' },
        { id: 'msh_bp',  label: 'Barbell Press',  file: 'Man_performing_barbell_press_202606180000.mp4' },
        { id: 'msh_fp',  label: 'Face Pulls',     file: 'Man_performing_face_pulls_202606172358.mp4' },
      ],
    },
    {
      id: 'legs', label: 'Legs', subtitle: 'Quads & Hamstrings',
      icon: 'run-fast', mcIcon: true, color: '#EF4444',
      videos: [
        { id: 'ml_sq',   label: 'Bodyweight Squat',  file: 'Man_performing_bodyweight_squat_202606110121.mp4' },
        { id: 'ml_bsq',  label: 'Barbell Squat',     file: 'Man_performing_barbell_squat_202606172035.mp4' },
        { id: 'ml_lun',  label: 'Forward Lunge',     file: 'Man_performing_forward_lunge_202606110121.mp4' },
        { id: 'ml_box',  label: 'Box Jump',          file: 'Man_performs_box_jump_202606110121.mp4' },
        { id: 'ml_kb',   label: 'Kettlebell Swings', file: 'Man_performing_kettlebell_swings_202606172359.mp4' },
        { id: 'ml_lp',   label: 'Leg Press',         file: 'Man_performing_leg_press_202606172359.mp4' },
      ],
    },
    {
      id: 'glutes', label: 'Glutes', subtitle: 'Posterior Chain',
      icon: 'human', mcIcon: true, color: '#A855F7',
      videos: [
        { id: 'mg_ht',  label: 'Hip Thrust',         file: 'Man_performing_barbell_hip_thrust_202606110121.mp4' },
        { id: 'mg_rdl', label: 'Romanian Deadlift',  file: 'Man_performing_Romanian_deadlift_202606172359.mp4' },
        { id: 'mg_dl',  label: 'Barbell Deadlift',   file: 'Man_performing_barbell_deadlift_202606110121.mp4' },
      ],
    },
    {
      id: 'recovery', label: 'Recovery', subtitle: 'Rest & Restore',
      icon: 'leaf', mcIcon: false, color: '#34D399',
      videos: [
        { id: 'mr_foam', label: 'Foam Rolling',   file: 'Man_foam-rolling_thighs_202606110121.mp4' },
        { id: 'mr_dd',   label: 'Downward Dog',   file: 'Man_holding_downward_dog_pose_202606110121.mp4' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOW DOWNLOAD BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function GlowDownloadBtn({ videoId, url, filename, dlState, dlProgress, onDownload }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const state = dlState[videoId] || 'idle';
  const progress = dlProgress[videoId] || 0;

  useEffect(() => {
    if (state !== 'idle') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 950, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 950, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200,241,53,0.3)', 'rgba(200,241,53,1)'],
  });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.9] });

  if (state === 'done') {
    return (
      <View style={styles.dlDone}>
        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
        <Text style={styles.dlDoneTxt}>Saved</Text>
      </View>
    );
  }

  if (state === 'downloading') {
    return (
      <View style={styles.dlProgress}>
        <View style={[styles.dlBar, { width: `${Math.round(progress * 100)}%` }]} />
        <Text style={styles.dlPct}>{Math.round(progress * 100)}%</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => onDownload(videoId, url, filename)} activeOpacity={0.8}>
      <Animated.View style={[styles.glowBtn, { borderColor, shadowOpacity, shadowColor: '#C8F135' }]}>
        <Ionicons name="download-outline" size={12} color="#C8F135" />
        <Text style={styles.glowTxt}>Download</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO CARD
// ─────────────────────────────────────────────────────────────────────────────
function VideoCard({ video, gender, sectionColor, dlState, dlProgress, onDownload, onPlay }) {
  const src = { uri: videoUrl(gender, video.file) };
  const isDownloaded = dlState[video.id] === 'done';

  return (
    <View style={styles.videoCard}>
      {/* Thumbnail */}
      <TouchableOpacity style={styles.thumbWrap} onPress={() => onPlay(video, gender)} activeOpacity={0.85}>
        <Video
          source={src}
          style={styles.thumbVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted
          isLooping={false}
          positionMillis={400}
        />
        {/* dark overlay */}
        <View style={styles.thumbOverlay} />
        {/* play icon */}
        <View style={[styles.playCircle, { borderColor: sectionColor + 'AA' }]}>
          <Ionicons name={isDownloaded ? 'play' : 'play-outline'} size={16} color="#fff" style={{ marginLeft: 2 }} />
        </View>
        {isDownloaded && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-done" size={10} color="#34D399" />
            <Text style={styles.offlineTxt}>Offline</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info + Download */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardLabel} numberOfLines={2}>{video.label}</Text>
        <GlowDownloadBtn
          videoId={video.id}
          url={videoUrl(gender, video.file)}
          filename={video.file}
          dlState={dlState}
          dlProgress={dlProgress}
          onDownload={onDownload}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION ROW (accordion)
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({ section, gender, isOpen, onToggle, dlState, dlProgress, onDownload, onPlay }) {
  const arrowAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(arrowAnim, { toValue: isOpen ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [isOpen]);

  const arrowRotate = arrowAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const doneCount = section.videos.filter(v => dlState[v.id] === 'done').length;

  return (
    <View style={styles.sectionWrap}>
      {/* Header */}
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.8}>
        {/* Left accent bar */}
        <View style={[styles.sectionAccent, { backgroundColor: section.color }]} />

        {/* Icon */}
        <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '22' }]}>
          {section.mcIcon
            ? <MaterialCommunityIcons name={section.icon} size={20} color={section.color} />
            : <Ionicons name={section.icon} size={20} color={section.color} />
          }
        </View>

        {/* Text */}
        <View style={{ flex: 1, marginLeft: rs(10) }}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          <Text style={styles.sectionSub}>{section.subtitle}</Text>
        </View>

        {/* Count + Arrow */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.sectionCount, { color: section.color }]}>
            {doneCount > 0 ? `${doneCount}/${section.videos.length}` : `${section.videos.length} videos`}
          </Text>
          <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: rs(14), paddingVertical: rs(12), gap: rs(12) }}
        >
          {section.videos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              gender={gender}
              sectionColor={section.color}
              dlState={dlState}
              dlProgress={dlProgress}
              onDownload={onDownload}
              onPlay={onPlay}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULLSCREEN VIDEO PLAYER OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function VideoPlayer({ video, gender, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    return () => { videoRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const localFile = localPath(video.file);
  const [useLocal, setUseLocal] = useState(false);

  useEffect(() => {
    FileSystem.getInfoAsync(localFile).then(info => { if (info.exists) setUseLocal(true); });
  }, []);

  const src = useLocal ? { uri: localFile } : { uri: videoUrl(gender, video.file) };

  return (
    <View style={styles.playerOverlay}>
      <View style={styles.playerCard}>
        {/* Close */}
        <TouchableOpacity style={styles.playerClose} onPress={onClose}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.playerTitle}>{video.label}</Text>
        {useLocal && (
          <View style={styles.offlinePill}>
            <Ionicons name="cloud-done" size={11} color="#34D399" />
            <Text style={{ color: '#34D399', fontSize: rf(10), fontWeight: '700', marginLeft: 4 }}>Playing Offline</Text>
          </View>
        )}
        <Video
          ref={videoRef}
          source={src}
          style={styles.playerVideo}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          useNativeControls
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoLibraryScreen({ navigation }) {
  const C    = useC();
  const user = useAuthStore(st => st.user);
  const gender = (user?.gender || '').toLowerCase() === 'female' ? 'female' : 'male';
  const sections = SECTIONS[gender];

  const [openSection, setOpenSection] = useState(null);
  const [dlState,    setDlState]    = useState({});
  const [dlProgress, setDlProgress] = useState({});
  const [playing,    setPlaying]    = useState(null);

  const toggleSection = useCallback((id) => {
    setOpenSection(prev => prev === id ? null : id);
  }, []);

  const ensureDir = async () => {
    const dir = FileSystem.documentDirectory + 'fitcore_videos/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    return dir;
  };

  const handleDownload = useCallback(async (videoId, url, filename) => {
    try {
      await ensureDir();
      const dest = localPath(filename);

      // check if already downloaded
      const info = await FileSystem.getInfoAsync(dest);
      if (info.exists) {
        setDlState(p => ({ ...p, [videoId]: 'done' }));
        Alert.alert('Already Saved', 'This video is already downloaded on your device.');
        return;
      }

      setDlState(p => ({ ...p, [videoId]: 'downloading' }));
      setDlProgress(p => ({ ...p, [videoId]: 0 }));

      const dl = FileSystem.createDownloadResumable(
        url, dest, {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const pct = totalBytesExpectedToWrite > 0
            ? totalBytesWritten / totalBytesExpectedToWrite : 0;
          setDlProgress(p => ({ ...p, [videoId]: pct }));
        }
      );

      await dl.downloadAsync();
      setDlState(p => ({ ...p, [videoId]: 'done' }));
      setDlProgress(p => ({ ...p, [videoId]: 1 }));

    } catch (e) {
      setDlState(p => ({ ...p, [videoId]: 'idle' }));
      Alert.alert('Download Failed', 'Please check your internet connection and try again.');
    }
  }, []);

  const handlePlay = useCallback((video, gender) => {
    setPlaying({ video, gender });
  }, []);

  const totalVideos    = sections.reduce((a, s) => a + s.videos.length, 0);
  const totalDownloaded = Object.values(dlState).filter(v => v === 'done').length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Video Library</Text>
          <Text style={[styles.headerSub, { color: C.dim }]}>
            {totalDownloaded > 0
              ? `${totalDownloaded} downloaded • ${totalVideos} total`
              : `${totalVideos} exercises • Tap to download`}
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeTxt}>{totalVideos}</Text>
        </View>
      </View>

      {/* ── Sections ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {sections.map(section => (
          <SectionRow
            key={section.id}
            section={section}
            gender={gender}
            isOpen={openSection === section.id}
            onToggle={() => toggleSection(section.id)}
            dlState={dlState}
            dlProgress={dlProgress}
            onDownload={handleDownload}
            onPlay={handlePlay}
          />
        ))}
      </ScrollView>

      {/* ── Video Player Overlay ── */}
      {playing && (
        <VideoPlayer
          video={playing.video}
          gender={playing.gender}
          onClose={() => setPlaying(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(14), gap: rs(10) },
  backBtn:       { width: rw(36), height: rw(36), borderRadius: rw(18), backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: rf(20), fontWeight: '800' },
  headerSub:     { fontSize: rf(12), marginTop: 2 },
  totalBadge:    { backgroundColor: '#C8F135', borderRadius: rw(12), paddingHorizontal: rs(10), paddingVertical: rs(3) },
  totalBadgeTxt: { color: '#000', fontSize: rf(11), fontWeight: '900' },

  // Section
  sectionWrap:   { marginHorizontal: rs(14), marginBottom: rs(10), borderRadius: rw(18), backgroundColor: '#16161F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: rs(14) },
  sectionAccent: { width: 3, height: '100%', borderRadius: 2, marginRight: rs(2) },
  sectionIconWrap:{ width: rw(42), height: rw(42), borderRadius: rw(12), alignItems: 'center', justifyContent: 'center' },
  sectionLabel:  { color: '#fff', fontSize: rf(15), fontWeight: '800' },
  sectionSub:    { color: 'rgba(255,255,255,0.45)', fontSize: rf(11), marginTop: 2 },
  sectionCount:  { fontSize: rf(11), fontWeight: '700' },

  // Video Card
  videoCard:     { width: rw(140), backgroundColor: '#1E1E2A', borderRadius: rw(14), overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  thumbWrap:     { width: '100%', height: rw(105), overflow: 'hidden' },
  thumbVideo:    { width: '100%', height: '100%' },
  thumbOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  playCircle:    { position: 'absolute', top: '50%', left: '50%', marginTop: -rw(18), marginLeft: -rw(18), width: rw(36), height: rw(36), borderRadius: rw(18), backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  offlineBadge:  { position: 'absolute', bottom: rs(5), right: rs(5), flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: rw(8), paddingHorizontal: rs(5), paddingVertical: rs(2), gap: 3 },
  offlineTxt:    { color: '#34D399', fontSize: rf(9), fontWeight: '700' },
  cardInfo:      { padding: rs(10) },
  cardLabel:     { color: '#fff', fontSize: rf(12), fontWeight: '700', marginBottom: rs(8), lineHeight: 16 },

  // Glow Download Button
  glowBtn:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: rw(20), paddingVertical: rs(6), paddingHorizontal: rs(10),
    backgroundColor: 'rgba(200,241,53,0.08)',
    shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  glowTxt:       { color: '#C8F135', fontSize: rf(11), fontWeight: '800' },
  dlProgress:    { height: rw(28), borderRadius: rw(14), backgroundColor: 'rgba(200,241,53,0.12)', overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)' },
  dlBar:         { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(200,241,53,0.35)' },
  dlPct:         { color: '#C8F135', fontSize: rf(11), fontWeight: '800', zIndex: 1 },
  dlDone:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: rs(6) },
  dlDoneTxt:     { color: '#34D399', fontSize: rf(11), fontWeight: '700' },

  // Player Overlay
  playerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  playerCard:    { width: SCREEN_W - rs(32), backgroundColor: '#16161F', borderRadius: rw(22), overflow: 'hidden', padding: rs(16) },
  playerClose:   { position: 'absolute', top: rs(12), right: rs(12), zIndex: 2, width: rw(32), height: rw(32), borderRadius: rw(16), backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  playerTitle:   { color: '#fff', fontSize: rf(16), fontWeight: '800', marginBottom: rs(6), paddingRight: rs(36) },
  playerVideo:   { width: '100%', height: rw(240), borderRadius: rw(14), marginTop: rs(8) },
  offlinePill:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: rw(10), paddingHorizontal: rs(8), paddingVertical: rs(3), alignSelf: 'flex-start', marginBottom: rs(6) },
});
