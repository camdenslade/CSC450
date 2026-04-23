// apps/mobile/src/shared/AppIcon.tsx
import { Image } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  size?: number;
};

const lightLogo = require("../../assets/light-mode/TabUp-Dark-Trans.png");
const darkLogo  = require("../../assets/dark-mode/TabUp-Light-Trans.png");

export function AppIcon({ size = 80 }: Props) {
  const { resolvedScheme } = useTheme();
  const source = resolvedScheme === "dark" ? darkLogo : lightLogo;
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
