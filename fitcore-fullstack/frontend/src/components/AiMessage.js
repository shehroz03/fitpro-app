import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rf, rs, rw } from '../utils/responsive';

// ── inline bold parser ─────────────────────────────────────────────────────
const BOLD_RE = /\*\*([^*]+)\*\*/g;

function InlineText({ text, style, accentColor }) {
  const parts = [];
  let last = 0, m;
  BOLD_RE.lastIndex = 0;
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), bold: false });
    parts.push({ t: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), bold: false });

  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.bold
          ? <Text key={i} style={{ color: accentColor, fontWeight: '800' }}>{p.t}</Text>
          : <Text key={i}>{p.t}</Text>
      )}
    </Text>
  );
}

// ── table parser ───────────────────────────────────────────────────────────
function AiTable({ rows, C }) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body   = rows.slice(1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{ marginVertical: rs(10) }}>
      <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
        {/* header row */}
        <View style={{ flexDirection: 'row', backgroundColor: `${C.accent}18` }}>
          {header.map((cell, i) => (
            <View key={i} style={[t.cell, t.hCell, { borderRightWidth: i < header.length - 1 ? 0.5 : 0, borderColor: C.border }]}>
              <Text style={{ color: C.accent, fontWeight: '800', fontSize: rf(11) }}>{cell}</Text>
            </View>
          ))}
        </View>
        {/* body rows */}
        {body.map((row, ri) => (
          <View key={ri} style={[{ flexDirection: 'row' }, ri < body.length - 1 && { borderBottomWidth: 0.5, borderColor: C.border }, ri % 2 === 1 && { backgroundColor: `${C.card2}80` }]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[t.cell, { borderRightWidth: ci < row.length - 1 ? 0.5 : 0, borderColor: C.border }]}>
                <Text style={{ color: C.text, fontSize: rf(12), lineHeight: rf(18) }}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const t = StyleSheet.create({
  cell:  { minWidth: rw(80), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  hCell: { },
});

// ── main renderer ──────────────────────────────────────────────────────────
export default function AiMessage({ text, C }) {
  const ACC  = C.accent;
  const body = { color: C.text, fontSize: rf(14), lineHeight: rf(22) };

  const lines = (text || '').split('\n');
  const elements = [];
  let tableRows = [];
  let bulletItems = [];
  let numberedItems = [];

  const flushBullets = (key) => {
    if (!bulletItems.length) return;
    elements.push(
      <View key={`bl-${key}`} style={{ marginVertical: rs(4), gap: rs(5) }}>
        {bulletItems}
      </View>
    );
    bulletItems = [];
  };

  const flushNumbered = (key) => {
    if (!numberedItems.length) return;
    elements.push(
      <View key={`nl-${key}`} style={{ marginVertical: rs(4), gap: rs(5) }}>
        {numberedItems}
      </View>
    );
    numberedItems = [];
  };

  const flushTable = (key) => {
    if (!tableRows.length) return;
    elements.push(<AiTable key={`tb-${key}`} rows={tableRows} C={C} />);
    tableRows = [];
  };

  const flushAll = (key) => { flushBullets(key); flushNumbered(key); flushTable(key); };

  lines.forEach((raw, i) => {
    const line = raw.trim();

    // H2
    if (line.startsWith('## ')) {
      flushAll(i);
      const title = line.slice(3);
      elements.push(
        <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: ACC, paddingLeft: rs(10), marginTop: rs(14), marginBottom: rs(4) }}>
          <InlineText text={title} accentColor={ACC}
            style={{ color: C.text, fontSize: rf(17), fontWeight: '900', lineHeight: rf(24) }} />
        </View>
      );
      return;
    }

    // H3
    if (line.startsWith('### ')) {
      flushAll(i);
      const title = line.slice(4);
      elements.push(
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: rs(7), marginTop: rs(10), marginBottom: rs(2) }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: ACC }} />
          <InlineText text={title} accentColor={ACC}
            style={{ color: C.text, fontSize: rf(14), fontWeight: '800', lineHeight: rf(20) }} />
        </View>
      );
      return;
    }

    // H4
    if (line.startsWith('#### ')) {
      flushAll(i);
      elements.push(
        <InlineText key={i} text={line.slice(5)} accentColor={ACC}
          style={{ color: ACC, fontSize: rf(13), fontWeight: '700', marginTop: rs(8), marginBottom: rs(2) }} />
      );
      return;
    }

    // Divider
    if (line === '---' || line === '— --' || line.match(/^-{3,}$/)) {
      flushAll(i);
      elements.push(
        <View key={i} style={{ height: 1, backgroundColor: C.border, marginVertical: rs(10), opacity: 0.5 }} />
      );
      return;
    }

    // Table separator row (skip)
    if (line.match(/^[\|\- :]+$/) && tableRows.length > 0) return;

    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      flushBullets(i); flushNumbered(i);
      const cols = line.split('|').slice(1, -1).map(s => s.trim());
      if (cols.length > 0) tableRows.push(cols);
      return;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('• ')) {
      flushNumbered(i); flushTable(i);
      const content = line.replace(/^[-•] /, '');
      bulletItems.push(
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: rs(8) }}>
          <View style={{ width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: ACC, marginTop: rs(8), flexShrink: 0 }} />
          <InlineText text={content} accentColor={ACC}
            style={{ ...body, flex: 1 }} />
        </View>
      );
      return;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      flushBullets(i); flushTable(i);
      const num  = line.match(/^(\d+)/)[1];
      const rest = line.replace(/^\d+\. /, '');
      numberedItems.push(
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: rs(10) }}>
          <View style={{ width: rs(22), height: rs(22), borderRadius: rs(11), backgroundColor: `${ACC}20`,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: rs(1) }}>
            <Text style={{ color: ACC, fontSize: rf(11), fontWeight: '800' }}>{num}</Text>
          </View>
          <InlineText text={rest} accentColor={ACC}
            style={{ ...body, flex: 1, paddingTop: rs(1) }} />
        </View>
      );
      return;
    }

    // Empty line — flush groups
    if (line === '') {
      flushBullets(i);
      flushNumbered(i);
      if (!tableRows.length) flushTable(i);
      return;
    }

    // Regular paragraph
    flushAll(i);
    elements.push(
      <InlineText key={i} text={line} accentColor={ACC}
        style={{ ...body, marginBottom: rs(2) }} />
    );
  });

  flushAll('end');

  return <View style={{ gap: rs(1) }}>{elements}</View>;
}
