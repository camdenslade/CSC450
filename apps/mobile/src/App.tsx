// apps/mobile/src/App.tsx
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Splittr</Text>
      <StatusBar style="auto" />
    </View>
  );
}