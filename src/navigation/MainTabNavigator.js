import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MarigoldTabBar from './MarigoldTabBar';
import HomeScreen from '../screens/home/HomeScreen';
import JournalScreen from '../screens/journal/JournalScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createMaterialTopTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MarigoldTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarLabel: 'Journal' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="You" component={SettingsScreen} options={{ tabBarLabel: 'You' }} />
    </Tab.Navigator>
  );
}
