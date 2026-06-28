import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../components/ThemedDialog';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import MarigoldLoader from '../../components/MarigoldLoader';
import { colors, textStyles, spacing, radii, fontFamilies, applyTheme, applyFontScale } from '../../theme';
import { haptics } from '../../utils/haptics';
import { useSettingsStore, useSyncStore, useAuthStore } from '../../stores';
import { getSetting, setSetting } from '../../db/queries/settings';
import { DEFAULTS } from '../../utils/constants';
import { signIn, signOutGoogle } from '../../services/googleAuth';
import { syncNow, getBackupInfo } from '../../services/driveSync';
import { isPinSet } from '../../services/pinAuth';

function Card({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.paper,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: spacing.cardPadding,
          marginBottom: spacing.gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function MyAccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const account = useSyncStore((s) => s.account);
  const vault = useAuthStore((s) => s.vault);
  const setAccount = useSyncStore((s) => s.setAccount);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const setLastSyncedAt = useSyncStore((s) => s.setLastSyncedAt);
  const dirty = useSyncStore((s) => s.dirty);
  const setDirty = useSyncStore((s) => s.setDirty);

  const diaryName = useSettingsStore((s) => s.diaryName);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [nameInput, setNameInput] = useState(diaryName);
  const [autoSync, setAutoSync] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    if (syncing) {
      spin.setValue(0);
      loop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
    }
    return () => loop && loop.stop();
  }, [syncing, spin]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    getSetting('autoSync', false).then(setAutoSync);
  }, []);

  useEffect(() => {
    if (!account) return;
    getBackupInfo()
      .then((info) => info && setLastSyncedAt(info.modifiedTime))
      .catch(() => {});
  }, [account]);

  const saveDiaryName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== diaryName) await updateSetting('diaryName', trimmed);
    else setNameInput(diaryName);
  };

  const connectGoogle = async () => {
    setBusy(true);
    try {
      const a = await signIn();
      if (a) {
        setAccount(a);
        // default the diary name to the Google first name if still unpersonalized
        if (!diaryName?.trim() || diaryName === DEFAULTS.diaryName) {
          const first = (a.name || '').trim().split(/\s+/)[0];
          if (first) {
            await updateSetting('diaryName', first);
            setNameInput(first);
          }
        }
      }
    } catch (err) {
      showAlert("Couldn't connect", err?.message || 'Try again.');
    }
    setBusy(false);
  };

  const disconnectGoogle = () => {
    showAlert('Disconnect Google?', 'Your local diary stays; cloud sync turns off.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await signOutGoogle();
          setAccount(null);
        },
      },
    ]);
  };

  const doSync = async () => {
    if (syncing || !account) return;
    setSyncing(true);
    setSyncError(false);
    try {
      const r = await syncNow();
      setLastSyncedAt(r.modifiedTime);
      setDirty(false);
      await useSettingsStore.getState().hydrate();
      const { theme, fontScale } = useSettingsStore.getState();
      applyTheme(theme);
      applyFontScale(fontScale);
      setNameInput(useSettingsStore.getState().diaryName);
      queryClient.invalidateQueries();
      haptics.success();
    } catch (err) {
      setSyncError(true);
      haptics.error();
    }
    setSyncing(false);
  };

  const toggleAutoSync = async (v) => {
    setAutoSync(v);
    await setSetting('autoSync', v);
  };

  const openPrivateSetup = async () => {
    if (vault !== 'main') return; // no nested private vaults
    if (!(await isPinSet())) {
      showAlert('Set an app PIN first', 'A private space needs the app lock enabled.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set PIN', onPress: () => navigation.navigate('PINSetup') },
      ]);
      return;
    }
    navigation.navigate('PrivateVaultSetup');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>← back</Text>
        </Pressable>
        <Pressable onLongPress={openPrivateSetup} delayLongPress={700}>
          <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14, marginBottom: 16 }]}>My account</Text>
        </Pressable>

        {/* Google account */}
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
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
              {account ? account.email : 'sign in to sync to Google Drive'}
            </Text>
          </View>
          {account ? (
            <Pressable onPress={disconnectGoogle} hitSlop={8}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.moods.frayed }}>disconnect</Text>
            </Pressable>
          ) : (
            <Pressable onPress={connectGoogle} disabled={busy} hitSlop={8} style={{ backgroundColor: colors.clay, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={[textStyles.labelBold, { color: colors.cream }]}>{busy ? '…' : 'connect'}</Text>
            </Pressable>
          )}
        </Card>

        {/* Diary name */}
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>diary name</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={saveDiaryName}
            onSubmitEditing={saveDiaryName}
            returnKeyType="done"
            style={{ fontFamily: fontFamilies.serifMedium, fontSize: 17, color: colors.ink, textAlign: 'right', minWidth: 120, paddingVertical: 2 }}
          />
        </Card>

        {/* Cloud sync */}
        <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: spacing.gap, marginBottom: 10 }]}>cloud sync</Text>
        <Card>
          {/* Sync row — title + last synced, spinning icon on the right */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: syncError ? colors.moods.frayed : account ? colors.ink : colors.softInk }}>
                {syncError ? 'Sync failed' : dirty ? 'Sync Now' : 'Sync Done'}
              </Text>
              <Text style={[textStyles.caption, { color: syncError ? colors.moods.frayed : colors.softInk, marginTop: 2 }]}>
                {!account
                  ? 'connect your account to sync'
                  : syncError
                  ? 'sync failed — tap to retry'
                  : lastSyncedAt
                  ? `last synced ${lastSyncedAt.slice(0, 10)} ${lastSyncedAt.slice(11, 16)}`
                  : 'not synced yet'}
              </Text>
            </View>
            <Pressable onPress={doSync} disabled={syncing || !account} hitSlop={10} style={{ padding: 6 }}>
              {syncing ? (
                <MarigoldLoader size={22} />
              ) : (
                <Feather name="refresh-cw" size={22} color={account ? colors.clayText : colors.hairline} />
              )}
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 14 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink }}>Auto-sync</Text>
              <Text style={[textStyles.caption, { color: colors.softInk, marginTop: 2 }]}>on open & when you leave the app</Text>
            </View>
            <Switch value={autoSync} onValueChange={toggleAutoSync} disabled={!account} trackColor={{ false: colors.hairline, true: colors.clay }} thumbColor={colors.cream} />
          </View>
        </Card>

        {/* Download book */}
        <Pressable onPress={() => navigation.navigate('Export')} hitSlop={8}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>Download my diary</Text>
            <Text style={{ fontFamily: fontFamilies.serifMedium, fontSize: 20, color: colors.clayText }}>→</Text>
          </Card>
        </Pressable>
      </ScrollView>
    </View>
  );
}
