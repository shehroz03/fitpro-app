import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// isReady: true when auth hydration + onboarding check are both done.
// Splash stays visible until BOTH video ends AND app is ready — no spinner after video.
export default function SplashVideoScreen({ onDone, isReady }) {
  const videoRef     = useRef(null);
  const doneRef      = useRef(false);
  const videoDoneRef = useRef(false);
  const isReadyRef   = useRef(isReady);
  const loadedRef    = useRef(false);
  const insets       = useSafeAreaInsets();
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const [waiting, setWaiting] = useState(false);

  // Keep ref in sync so callbacks always read the latest value
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);

  const complete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  }, [onDone]);

  // Video finished or skip pressed
  const finish = useCallback(() => {
    videoDoneRef.current = true;
    if (isReadyRef.current) {
      complete();
    } else {
      setWaiting(true); // brief "Syncing..." label while auth finishes
    }
  }, [complete]);

  // App became ready after video already ended
  useEffect(() => {
    if (isReady && videoDoneRef.current) complete();
  }, [isReady, complete]);

  // Hard fallback: force exit after 14s so user is never permanently stuck
  useEffect(() => {
    const t = setTimeout(complete, 14000);
    return () => clearTimeout(t);
  }, [complete]);

  const handleReady = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <View style={s.root}>
      <StatusBar hidden />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Video
          ref={videoRef}
          source={require('../../assets/splash_intro.mp4')}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted={false}
          onReadyForDisplay={handleReady}
          onPlaybackStatusUpdate={status => {
            if (status.isPlaying && !loadedRef.current) handleReady();
            if (status.didJustFinish) finish();
          }}
          onError={finish}
        />
      </Animated.View>

      <LinearGradient colors={['#0A0A0F', 'transparent']}
        style={s.topFade} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(10,10,15,0.9)', '#0A0A0F']}
        style={s.bottomFade} pointerEvents="none" />

      <TouchableOpacity
        style={[s.skipBtn, { bottom: insets.bottom + 24 }]}
        onPress={finish}
        activeOpacity={0.7}
      >
        {waiting ? (
          <>
            <View style={s.dot} />
            <Text style={s.skipTxt}>Syncing...</Text>
          </>
        ) : (
          <>
            <Text style={s.skipTxt}>Skip</Text>
            <Text style={s.skipArrow}>&#8250;</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0A0A0F', overflow: 'hidden' },
  topFade:    { position: 'absolute', top: 0,    left: 0, right: 0, height: 120 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  skipBtn: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,10,15,0.72)',
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.35)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  skipTxt:   { color: '#C8F135', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  skipArrow: { color: '#C8F135', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8F135' },
});
