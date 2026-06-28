import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, radii, fontFamilies } from '../theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Search entries…', autoFocus = false, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.paper,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: colors.hairline,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.softInk}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        style={{
          flex: 1,
          fontFamily: fontFamilies.serif,
          fontSize: 16,
          color: colors.ink,
          paddingVertical: 11,
        }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Text style={{ color: colors.softInk, fontSize: 16 }}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
