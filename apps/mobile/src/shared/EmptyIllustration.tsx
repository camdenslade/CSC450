import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../theme/colors";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
};

export function EmptyIllustration({ icon, size = 56 }: Props) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", marginBottom: 16 }}>
      <View style={{
        width: size + 32, height: size + 32, borderRadius: (size + 32) / 2,
        backgroundColor: c.primaryLight, alignItems: "center", justifyContent: "center",
      }}>
        <View style={{
          width: size + 16, height: size + 16, borderRadius: (size + 16) / 2,
          backgroundColor: c.primaryLight + "CC", alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name={icon} size={size} color={c.primary} />
        </View>
      </View>
    </View>
  );
}
