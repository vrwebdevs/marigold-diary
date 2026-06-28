import { View } from 'react-native';
import { colors } from '../theme';
import MarigoldLoader from './MarigoldLoader';

/** Full-screen centered marigold loader for screens whose data isn't ready yet. */
export default function ScreenLoader({ size = 56 }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.backdrop, alignItems: 'center', justifyContent: 'center' }}>
      <MarigoldLoader size={size} />
    </View>
  );
}
