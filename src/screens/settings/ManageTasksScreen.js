import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, textStyles, spacing, radii, fontFamilies, shadows } from '../../theme';
import { showAlert } from '../../components/ThemedDialog';
import { usePersons, useCreatePerson, useDeletePerson } from '../../hooks/useTasks';
import { haptics } from '../../utils/haptics';

export default function ManageTasksScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [personInput, setPersonInput] = useState('');

  const { data: persons = [] } = usePersons();
  const createPerson = useCreatePerson();
  const deletePerson = useDeletePerson();

  const addPerson = async () => {
    const val = personInput.trim();
    if (!val) return;
    if (persons.some((p) => p.name.toLowerCase() === val.toLowerCase())) {
      showAlert('Already exists', `"${val}" is already in your persons list.`);
      return;
    }
    Keyboard.dismiss();
    setPersonInput('');
    await createPerson.mutateAsync(val);
    haptics.success();
  };

  const confirmDeletePerson = (item) => {
    showAlert(`Remove "${item.name}"?`, 'They will be removed from the persons list.', [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'remove',
        style: 'destructive',
        onPress: () => { deletePerson.mutate(item.id); haptics.success(); },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop }}>
      {/* header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: spacing.screenX,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 14 }}>
          <Feather name="arrow-left" size={22} color={colors.softInk} />
        </Pressable>
        <Text style={[textStyles.title, { color: colors.ink }]}>Manage Tasks</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Persons section ────────────────────────────────── */}
        <Text style={[textStyles.label, { color: colors.mutedLabel, marginTop: spacing.sectionGap, marginBottom: 10 }]}>
          persons
        </Text>

        {persons.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.paper,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: spacing.cardPadding,
              paddingVertical: 12,
              marginBottom: spacing.gap,
              ...shadows.card,
            }}
          >
            <Text style={{ fontFamily: fontFamilies.sans, fontSize: 15, color: colors.ink, flex: 1 }}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => confirmDeletePerson(item)} hitSlop={10}>
              <Feather name="x" size={16} color={colors.softInk} />
            </TouchableOpacity>
          </View>
        ))}

        {persons.length === 0 && (
          <Text style={{ fontFamily: fontFamilies.sans, fontSize: 14, color: colors.softInk, marginBottom: spacing.gap }}>
            No persons yet. Add one below.
          </Text>
        )}

        {/* add person */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.paper,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: spacing.cardPadding,
            paddingVertical: 4,
            ...shadows.card,
          }}
        >
          <TextInput
            value={personInput}
            onChangeText={setPersonInput}
            onSubmitEditing={addPerson}
            placeholder="New person…"
            placeholderTextColor={colors.softInk}
            returnKeyType="done"
            blurOnSubmit={false}
            style={{
              flex: 1,
              fontFamily: fontFamilies.sans,
              fontSize: 15,
              color: colors.ink,
              paddingVertical: 10,
            }}
          />
          <TouchableOpacity onPress={addPerson} hitSlop={8} disabled={!personInput.trim()}>
            <Feather name="plus" size={20} color={personInput.trim() ? colors.clay : colors.softInk} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
