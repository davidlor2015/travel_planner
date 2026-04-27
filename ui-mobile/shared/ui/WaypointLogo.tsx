// Path: ui-mobile/shared/ui/WaypointLogo.tsx
// Summary: Implements WaypointLogo module logic.

import { View, Text } from "react-native";
import Svg, { Path, G, Defs, ClipPath, Rect } from "react-native-svg";

import { fontStyles } from "@/shared/theme/typography";

type Props = {
  size?: number;
  color?: string;
};

// The mark extracted from ui/public/Logo.svg.
// The clip rect is 69.63×69.63 at offset (9.47, 0); the star spike at the
// top extends to y ≈ -3.55, so the viewBox adds a small bleed above.
export function WaypointMark({ size = 24, color = "#1C1108" }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="9 -4 71 74"
      fill="none"
    >
      <G clipPath="url(#mark-clip)">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M45.4644 -3.54999L51.2668 32.715L80.2788 39.968L51.2668 47.221L45.4644 66.0789L39.662 47.221L10.65 39.968L39.662 32.715L45.4644 -3.54999ZM45.4644 35.6162C44.3103 35.6162 43.2034 36.0747 42.3872 36.8909C41.5711 37.707 41.1126 38.8139 41.1126 39.968C41.1126 41.1222 41.5711 42.2291 42.3872 43.0452C43.2034 43.8614 44.3103 44.3198 45.4644 44.3198C46.6186 44.3198 47.7255 43.8614 48.5416 43.0452C49.3577 42.2291 49.8162 41.1222 49.8162 39.968C49.8162 38.8139 49.3577 37.707 48.5416 36.8909C47.7255 36.0747 46.6186 35.6162 45.4644 35.6162Z"
          fill={color}
        />
      </G>
      <Defs>
        <ClipPath id="mark-clip">
          <Rect x="9.46667" y="0" width="69.6288" height="69.6288" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

// Mark + "Waypoint" wordmark as a horizontal lockup.
export function WaypointLogo({ size = 22, color = "#1C1108" }: Props) {
  const textSize = Math.round(size * 0.55);
  const letterSpacing = size * 0.1;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.35 }}>
      <WaypointMark size={size} color={color} />
      <Text
        style={[
          fontStyles.uiSemibold,
          {
            fontSize: textSize,
            letterSpacing,
            textTransform: "uppercase",
            color,
          },
        ]}
      >
        Waypoint
      </Text>
    </View>
  );
}
