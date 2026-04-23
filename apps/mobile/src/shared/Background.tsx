import { ReactNode } from "react";
import { View } from "react-native";
import { useColors } from "../theme/colors";

export function Background({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={{ flex: 1, backgroundColor: c.background }}>{children}</View>;
}
