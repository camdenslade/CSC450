// apps/mobile/src/App.tsx
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./home/HomeScreen";

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <HomeScreen />
    </>
  );
}
