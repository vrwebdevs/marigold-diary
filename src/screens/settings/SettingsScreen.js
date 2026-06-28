import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../components/ThemedDialog';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, textStyles, spacing, radii, fontFamilies, applyTheme, applyFontScale, THEMES, THEME_NAMES } from '../../theme';
import SectionHeader from '../../components/SectionHeader';
import ConsentModal from '../../components/ConsentModal';
import AIKeyHelpModal from '../../components/AIKeyHelpModal';
import { useSettingsStore, useSyncStore } from '../../stores';
import { getSetting, setSetting } from '../../db/queries/settings';
import {
  ensureNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
  scheduleOnThisDayReminder,
  cancelOnThisDayReminder,
} from '../../services/notifications';
import {
  hasUserApiKey,
  setUserApiKey,
  verifyUserApiKey,
  getSharingMode,
  setSharingMode,
  getAiEnabledFlag,
  setAiEnabledFlag,
} from '../../services/geminiAI';

const SHARING_OPTIONS = [
  { value: 'aggregates', label: 'Mood & tags only', caption: 'counts only — never any entry text' },
  { value: 'selective', label: 'Entries I mark ✦', caption: 'only entries where you ticked the AI checkbox' },
  { value: 'all', label: 'Everything', caption: 'all unlocked entries — locked stay private' },
];

/** '21:00' + 30 → '21:30' (wraps around midnight). */
function stepTime(timeHHmm, deltaMinutes) {
  const [h, m] = timeHHmm.split(':').map(Number);
  const total = (h * 60 + m + deltaMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function Row({ children }) {
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: radii.card,
        padding: spacing.cardPadding,
        borderWidth: 1,
        borderColor: colors.hairline,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.gap,
      }}
    >
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const reminderEnabled = useSettingsStore((s) => s.reminderEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [onThisDayEnabled, setOnThisDayEnabled] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [keySet, setKeySet] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [checkingKey, setCheckingKey] = useState(false);
  const [sharingMode, setSharingModeState] = useState('none');
  const [pendingMode, setPendingMode] = useState(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const themeName = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const diaryName = useSettingsStore((s) => s.diaryName);
  const account = useSyncStore((s) => s.account);

  const pickTheme = async (name) => {
    applyTheme(name);
    await updateSetting('theme', name); // store change remounts the nav tree
  };

  const pickFontScale = async (scale) => {
    applyFontScale(scale);
    await updateSetting('fontScale', scale);
  };

  useEffect(() => {
    getSetting('onThisDayReminder', false).then(setOnThisDayEnabled);
    getAiEnabledFlag().then(setAiEnabled);
    getSetting('autoLock', true).then(setAutoLock);
    hasUserApiKey().then(setKeySet);
    getSharingMode().then(setSharingModeState);
  }, []);

  // keep live values for the blur-time revert (avoids a stale-closure flip-off when a key connects)
  const aiEnabledRef = useRef(aiEnabled);
  const keySetRef = useRef(keySet);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);
  useEffect(() => { keySetRef.current = keySet; }, [keySet]);

  // leaving the screen with AI on but no key connected reverts it to off
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (aiEnabledRef.current && !keySetRef.current) {
          setAiEnabled(false);
          setAiEnabledFlag(false);
        }
      };
    }, [])
  );

  const toggleDaily = async (value) => {
    if (value) {
      const ok = await ensureNotificationPermissions();
      if (!ok) {
        showAlert('Notifications are off', 'Allow notifications for Expo Go in system settings.');
        return;
      }
      await updateSetting('reminderEnabled', true);
      await scheduleDailyReminder(reminderTime);
    } else {
      await updateSetting('reminderEnabled', false);
      await cancelDailyReminder();
    }
  };

  const shiftTime = async (delta) => {
    const next = stepTime(reminderTime, delta);
    await updateSetting('reminderTime', next);
    if (reminderEnabled) {
      await scheduleDailyReminder(next);
    }
  };

  const toggleOnThisDay = async (value) => {
    if (value) {
      const ok = await ensureNotificationPermissions();
      if (!ok) {
        showAlert('Notifications are off', 'Allow notifications for Expo Go in system settings.');
        return;
      }
      setOnThisDayEnabled(true);
      await setSetting('onThisDayReminder', true);
      await scheduleOnThisDayReminder();
    } else {
      setOnThisDayEnabled(false);
      await setSetting('onThisDayReminder', false);
      await cancelOnThisDayReminder();
    }
  };

  const toggleAI = async (value) => {
    setAiEnabled(value);
    await setAiEnabledFlag(value && keySet); // not truly on until a key is connected
  };

  const toggleAutoLock = async (value) => {
    setAutoLock(value);
    await setSetting('autoLock', value);
  };

  const saveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setCheckingKey(true);
    await setUserApiKey(trimmed);
    const ok = await verifyUserApiKey();
    setCheckingKey(false);
    if (!ok) {
      await setUserApiKey(null);
      showAlert("That key didn't work", 'Check it and try again.');
      return;
    }
    setKeySet(true);
    setKeyInput('');
    await setAiEnabledFlag(true);
    queryClient.invalidateQueries({ queryKey: ['writingPrompt'] });
    showAlert('Connected', 'AI features are ready.');
  };

  const removeKey = async () => {
    await setUserApiKey(null);
    setKeySet(false);
    setAiEnabled(false);
    await setAiEnabledFlag(false);
    queryClient.invalidateQueries({ queryKey: ['writingPrompt'] });
  };

  const onToggleMode = async (value, turningOn) => {
    if (turningOn) {
      setPendingMode(value); // consent modal decides — every single time
    } else {
      setSharingModeState('none');
      await setSharingMode('none');
    }
  };

  const confirmPendingMode = async () => {
    setSharingModeState(pendingMode);
    await setSharingMode(pendingMode);
    setPendingMode(null);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backdrop,
        paddingTop: insets.top + 12,
      }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
              ← back
            </Text>
          </Pressable>
        ) : null}
        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>You</Text>

        {/* My account → dedicated screen */}
        <Pressable onPress={() => navigation.navigate('MyAccount')}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.cardPadding,
              marginTop: 16,
            }}
          >
            {account?.photo ? (
              <Image source={{ uri: account.photo }} style={{ width: 46, height: 46, borderRadius: 999, marginRight: 14 }} />
            ) : (
              <View style={{ width: 46, height: 46, borderRadius: 999, backgroundColor: colors.clayTint, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: colors.clayText }}>
                  {((account?.name || diaryName || '?').trim().charAt(0) || '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 18, color: colors.ink }} numberOfLines={1}>
                {account?.name || diaryName}
              </Text>
              <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 2 }]} numberOfLines={1}>
                {account ? account.email : 'account, sync & backup'}
              </Text>
            </View>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </View>
        </Pressable>

        <SectionHeader label="tags" style={{ marginTop: spacing.sectionGap }} />
        <Pressable onPress={() => navigation.navigate('TagFilter')} hitSlop={8}>
          <Row>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              Manage your tags
            </Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </Row>
        </Pressable>

        <SectionHeader label="emotions" style={{ marginTop: spacing.sectionGap }} />
        <Pressable onPress={() => navigation.navigate('MoodManager')} hitSlop={8}>
          <Row>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              Manage emotions
            </Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </Row>
        </Pressable>

        <SectionHeader label="ai" style={{ marginTop: spacing.sectionGap }} />

        <Row>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
            AI features
          </Text>
          <Switch
            value={aiEnabled}
            onValueChange={toggleAI}
            trackColor={{ false: colors.hairline, true: colors.clay }}
            thumbColor={colors.cream}
          />
        </Row>

        {aiEnabled && !keySet ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[textStyles.caption, { color: colors.mutedLabel, flex: 1 }]}>
                paste your free Gemini API key
              </Text>
              <Pressable onPress={() => setHelpVisible(true)} hitSlop={8}>
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 13, color: colors.clayText }}>
                  how to get one? →
                </Text>
              </Pressable>
            </View>
            <Row>
              <TextInput
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder="Paste your Gemini API key here !"
                placeholderTextColor={colors.softInk}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={{
                  flex: 1,
                  fontFamily: fontFamilies.sans,
                  fontSize: 13,
                  color: colors.ink,
                  paddingVertical: 4,
                }}
              />
              {keyInput.trim() ? (
                <Pressable onPress={saveKey} hitSlop={8} disabled={checkingKey}>
                  <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.clayText }}>
                    {checkingKey ? 'checking…' : 'connect'}
                  </Text>
                </Pressable>
              ) : null}
            </Row>
          </>
        ) : null}

        {aiEnabled && keySet ? (
          <>
            <Row>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
                gemini connected ✓
              </Text>
              <Pressable onPress={removeKey} hitSlop={8}>
                <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.moods.frayed }}>
                  disconnect
                </Text>
              </Pressable>
            </Row>

            <Text style={[textStyles.label, { color: colors.mutedLabel, marginBottom: 10, marginTop: 4 }]}>
              what the ai may see
            </Text>
            {SHARING_OPTIONS.map((option) => (
              <Row key={option.value}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink }}>
                    {option.label}
                  </Text>
                  <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 2 }]}>
                    {option.caption}
                  </Text>
                </View>
                <Switch
                  value={sharingMode === option.value}
                  onValueChange={(turningOn) => onToggleMode(option.value, turningOn)}
                  trackColor={{ false: colors.hairline, true: colors.clay }}
                  thumbColor={colors.cream}
                />
              </Row>
            ))}
          </>
        ) : null}

        <Text style={[textStyles.caption, { color: colors.mutedLabel, marginTop: spacing.gap }]}>
          the daily prompt is AI-written but contains none of your data — only today's date
        </Text>

        <SectionHeader label="reminders" style={{ marginTop: spacing.sectionGap }} />

        <Row>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
            Daily writing reminder
          </Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleDaily}
            trackColor={{ false: colors.hairline, true: colors.clay }}
            thumbColor={colors.cream}
          />
        </Row>

        {reminderEnabled ? (
          <Row>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              remind me at
            </Text>
            <Pressable onPress={() => shiftTime(-30)} hitSlop={10} style={{ paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: colors.clayText }}>−</Text>
            </Pressable>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 19, color: colors.ink }}>
              {reminderTime}
            </Text>
            <Pressable onPress={() => shiftTime(30)} hitSlop={10} style={{ paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 22, color: colors.clayText }}>+</Text>
            </Pressable>
          </Row>
        ) : null}

        <Row>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
            On this day · 9:00 am
          </Text>
          <Switch
            value={onThisDayEnabled}
            onValueChange={toggleOnThisDay}
            trackColor={{ false: colors.hairline, true: colors.clay }}
            thumbColor={colors.cream}
          />
        </Row>

        <SectionHeader label="appearance" style={{ marginTop: spacing.sectionGap }} />

        <View style={{ flexDirection: 'row', gap: spacing.gap, marginBottom: spacing.gap }}>
          {THEME_NAMES.map((name) => (
            <Pressable key={name} onPress={() => pickTheme(name)} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: THEMES[name].backdrop,
                  borderWidth: themeName === name ? 2.5 : 1,
                  borderColor: themeName === name ? colors.clayText : colors.hairline,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    backgroundColor: THEMES[name].paper,
                    borderWidth: 1,
                    borderColor: THEMES[name].hairline,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: THEMES[name].clay }} />
                </View>
              </View>
              <Text
                style={{
                  fontFamily: fontFamilies.sans,
                  fontSize: 13,
                  marginTop: 4,
                  color: themeName === name ? colors.clayText : colors.softInk,
                  textTransform: 'capitalize',
                }}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Row>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
            Text size
          </Text>
          {[
            { scale: 0.9, label: 'small' },
            { scale: 1, label: 'regular' },
            { scale: 1.15, label: 'large' },
          ].map((option) => (
            <Pressable
              key={option.label}
              onPress={() => pickFontScale(option.scale)}
              hitSlop={6}
              style={{
                borderRadius: radii.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginLeft: 6,
                backgroundColor: fontScale === option.scale ? colors.clayTint : 'transparent',
                borderWidth: 1,
                borderColor: fontScale === option.scale ? colors.clayText : colors.hairline,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilies.sans,
                  fontSize: 12,
                  color: fontScale === option.scale ? colors.clayText : colors.midInk,
                  textTransform: 'capitalize',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </Row>

        <SectionHeader label="privacy" style={{ marginTop: spacing.sectionGap }} />
        <Pressable onPress={() => navigation.navigate('PINSetup')} hitSlop={8}>
          <Row>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              App lock & entry locks
            </Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>
              →
            </Text>
          </Row>
        </Pressable>
        <Row>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink }}>Auto-lock</Text>
            <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 2 }]}>
              lock the app when you leave it
            </Text>
          </View>
          <Switch
            value={autoLock}
            onValueChange={toggleAutoLock}
            trackColor={{ false: colors.hairline, true: colors.clay }}
            thumbColor={colors.cream}
          />
        </Row>

        <SectionHeader label="about" style={{ marginTop: spacing.sectionGap }} />
        <Pressable onPress={() => navigation.navigate('About')} hitSlop={8}>
          <Row>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              About Marigold
            </Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </Row>
        </Pressable>

        <ConsentModal
          mode={pendingMode}
          visible={!!pendingMode}
          onAccept={confirmPendingMode}
          onCancel={() => setPendingMode(null)}
        />
        <AIKeyHelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
      </ScrollView>
    </View>
  );
}
