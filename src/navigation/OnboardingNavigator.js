import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import SetupScreen from '../screens/onboarding/SetupScreen';
import RestoreScreen from '../screens/onboarding/RestoreScreen';

const Stack = createNativeStackNavigator();

/** First-run flow, mounted ABOVE the main app and only while !onboarded — so it can't reappear. */
export default function OnboardingNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.backdrop } }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Restore" component={RestoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
