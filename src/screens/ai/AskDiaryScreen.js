import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies } from '../../theme';
import { isAIReady, getSharingMode } from '../../services/geminiAI';
import { answerDiaryQuestion, ACCESS_MESSAGES } from '../../services/aiDigest';

export default function AskDiaryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [gate, setGate] = useState(null); // null = OK, string = blocking message
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await isAIReady())) {
        setGate(ACCESS_MESSAGES.AI_OFF);
        return;
      }
      const mode = await getSharingMode();
      if (mode === 'none') setGate(ACCESS_MESSAGES.SHARING_OFF);
      else if (mode === 'aggregates') setGate(ACCESS_MESSAGES.CONTENT_OFF);
      else setGate(null);
    })();
  }, []);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    const history = messages;
    setMessages([...history, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const answer = await answerDiaryQuestion(question, history);
      setMessages((current) => [...current, { role: 'assistant', text: answer }]);
    } catch (err) {
      const note =
        ACCESS_MESSAGES[err.message] || 'something went wrong — try again in a moment';
      setMessages((current) => [...current, { role: 'assistant', text: note }]);
    }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: spacing.screenX }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
            ← back
          </Text>
        </Pressable>
        <Text style={[textStyles.heading, { color: colors.ink, marginTop: 14 }]}>Ask Diary</Text>
      </View>

      {gate ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screenX }}>
          <Text
            style={{
              fontFamily: fontFamilies.sans,
              fontSize: 15,
              color: colors.softInk,
              textAlign: 'center',
            }}
          >
            {gate}
          </Text>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.clayText }}>
              open settings →
            </Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ padding: spacing.screenX, paddingBottom: 12, flexGrow: 1 }}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: fontFamilies.sans,
                    fontSize: 15,
                    color: colors.softInk,
                    textAlign: 'center',
                  }}
                >
                  ask anything about what you've written —{'\n'}"when did I last feel calm?"
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: item.role === 'user' ? colors.clayTint : colors.paper,
                  borderRadius: radii.card,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  marginBottom: spacing.gap,
                  maxWidth: '85%',
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}
              >
                <Text style={[textStyles.body, { fontSize: 16, lineHeight: 24, color: colors.ink }]}>
                  {item.text}
                </Text>
              </View>
            )}
          />
          {busy ? (
            <Text
              style={{
              fontFamily: fontFamilies.sans,
              fontSize: 14,
                color: colors.softInk,
                paddingHorizontal: spacing.screenX,
                paddingBottom: 6,
              }}
            >
              thinking…
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: spacing.screenX,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="ask your diary…"
              placeholderTextColor={colors.softInk}
              onSubmitEditing={send}
              returnKeyType="send"
              style={{
                flex: 1,
                backgroundColor: colors.paper,
                borderRadius: radii.input,
                borderWidth: 1,
                borderColor: colors.hairline,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontFamily: fontFamilies.serif,
                fontSize: 16,
                color: colors.ink,
              }}
            />
            <Pressable
              onPress={send}
              disabled={busy || !input.trim()}
              hitSlop={8}
              style={{
                backgroundColor: input.trim() && !busy ? colors.clay : colors.hairline,
                borderRadius: radii.pill,
                paddingHorizontal: 18,
                paddingVertical: 10,
              }}
            >
              <Text style={[textStyles.labelBold, { color: input.trim() && !busy ? colors.cream : colors.softInk }]}>
                ask
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
