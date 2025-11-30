import {
  type BrandVariants,
  createDarkTheme,
  createLightTheme,
  type Theme,
} from "@fluentui/react-components";

// CSC Kuwait Portal-inspired brand colors
// Deep navy blue with gold accents for professional governmental aesthetic
const brandColors: BrandVariants = {
  10: "#000408",
  20: "#001019",
  30: "#001829",
  40: "#002139",
  50: "#002A49",
  60: "#003359",
  70: "#003D6A",
  80: "#00467A",
  90: "#00508B",
  100: "#005A9C",
  110: "#0064AD",
  120: "#006EBE",
  130: "#1A7DCF",
  140: "#3D8DD9",
  150: "#5E9EE3",
  160: "#7DAFED",
};

// Gold/amber accent colors for complementary highlights
export const goldAccent = {
  light: "#D4AF37",    // Gold
  medium: "#C5A028",   // Darker gold
  dark: "#B8941F",     // Deep gold
};

export const lightTheme: Theme = {
  ...createLightTheme(brandColors),
  // Override with gold accents for specific interactive elements
  colorBrandForeground2: "#C5A028",
  colorBrandForegroundLink: brandColors[110],
  colorBrandForegroundLinkHover: brandColors[120],
};

export const darkTheme: Theme = {
  ...createDarkTheme(brandColors),
  // Enhanced dark mode with gold accent highlights
  colorBrandForeground1: brandColors[130],
  colorBrandForeground2: "#D4AF37",
  colorBrandForegroundLink: brandColors[150],
  colorBrandForegroundLinkHover: brandColors[160],
};
