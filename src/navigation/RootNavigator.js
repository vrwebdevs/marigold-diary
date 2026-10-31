import { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useAuthStore, useSettingsStore } from '../stores';
import MainTabNavigator from './MainTabNavigator';
import BookScreen from '../screens/book/BookScreen';
import WriteScreen from '../screens/write/WriteScreen';
import EntryDetailScreen from '../screens/journal/EntryDetailScreen';
import CalendarScreen from '../screens/explore/CalendarScreen';
import OnThisDayScreen from '../screens/explore/OnThisDayScreen';
import TagFilterScreen from '../screens/explore/TagFilterScreen';
import SearchScreen from '../screens/explore/SearchScreen';
import AskDiaryScreen from '../screens/ai/AskDiaryScreen';
import PINSetupScreen from '../screens/auth/PINSetupScreen';
import PrivateVaultSetupScreen from '../screens/auth/PrivateVaultSetupScreen';
import PINLockScreen from '../screens/auth/PINLockScreen';
import ExportScreen from '../screens/export/ExportScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import MyAccountScreen from '../screens/settings/MyAccountScreen';
import MoodManagerScreen from '../screens/settings/MoodManagerScreen';
import ManageTasksScreen from '../screens/settings/ManageTasksScreen';
import TaskHistoryScreen from '../screens/tasks/TaskHistoryScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import HowItWorksScreen from '../screens/settings/HowItWorksScreen';

const Stack = createNativeStackNavigator();

/** Locked → only PINLock exists; unlocking swaps in the full app. */
export default function RootNavigator() {
  const isUnlocked = useAuthStore((s) => s.isUnlocked);
  const vault = useAuthStore((s) => s.vault);
  const themeName = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const navStateRef = useRef();
  const prevVaultRef = useRef(vault);
  // a vault switch should start fresh at Home; theme/text-size remounts should NOT
  if (prevVaultRef.current !== vault) {
    prevVaultRef.current = vault;
    navStateRef.current = undefined;
  }
  return (
    <NavigationContainer
      key={`${themeName}-${fontScale}-${vault}`}
      initialState={navStateRef.current}
      onStateChange={(state) => { navStateRef.current = state; }}
    >
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backdrop },
        }}
      >
        {!isUnlocked ? (
          <Stack.Screen name="PINLock" component={PINLockScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Book" component={BookScreen} />
            <Stack.Screen name="Write" component={WriteScreen} />
            <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="OnThisDay" component={OnThisDayScreen} />
            <Stack.Screen name="TagFilter" component={TagFilterScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="AskDiary" component={AskDiaryScreen} />
            <Stack.Screen name="PINSetup" component={PINSetupScreen} />
            <Stack.Screen name="PrivateVaultSetup" component={PrivateVaultSetupScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="MyAccount" component={MyAccountScreen} />
            <Stack.Screen name="MoodManager" component={MoodManagerScreen} />
            <Stack.Screen name="ManageTasks" component={ManageTasksScreen} />
            <Stack.Screen name="TaskHistory" component={TaskHistoryScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
