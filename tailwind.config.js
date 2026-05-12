/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "secondary-fixed-dim": "#d1bcff",
        "surface": "#121318",
        "tertiary-fixed": "#e1e1ed",
        "error-container": "#93000a",
        "surface-tint": "#00daf3",
        "on-secondary-fixed": "#24005b",
        "on-primary-container": "#00626e",
        "secondary-container": "#6800ec",
        "surface-container-lowest": "#0d0e13",
        "on-tertiary-container": "#575862",
        "on-tertiary-fixed-variant": "#454650",
        "surface-variant": "#34343a",
        "primary-fixed": "#9cf0ff",
        "tertiary": "#ebebf7",
        "inverse-on-surface": "#2f3036",
        "secondary": "#d1bcff",
        "outline": "#849396",
        "on-secondary-container": "#d4c0ff",
        "on-primary-fixed": "#001f24",
        "error": "#ffb4ab",
        "surface-container-high": "#292a2f",
        "surface-container-highest": "#34343a",
        "inverse-surface": "#e3e1e9",
        "surface-container-low": "#1a1b21",
        "on-surface": "#e3e1e9",
        "on-primary": "#00363d",
        "outline-variant": "#3b494c",
        "secondary-fixed": "#eaddff",
        "on-tertiary-fixed": "#191b23",
        "inverse-primary": "#006875",
        "on-surface-variant": "#bac9cc",
        "primary-container": "#00e5ff",
        "on-error-container": "#ffdad6",
        "primary-fixed-dim": "#00daf3",
        "on-secondary-fixed-variant": "#5700c8",
        "surface-container": "#1e1f25",
        "background": "#121318",
        "on-secondary": "#3d0090",
        "surface-dim": "#121318",
        "on-primary-fixed-variant": "#004f58",
        "on-background": "#e3e1e9",
        "on-tertiary": "#2e3039",
        "surface-bright": "#38393f",
        "on-error": "#690005",
        "tertiary-fixed-dim": "#c5c6d1",
        "primary": "#c3f5ff",
        "tertiary-container": "#cfcfdb"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "4px",
        "xl": "32px",
        "gutter-mobile": "12px",
        "xs": "4px",
        "sm": "8px",
        "lg": "24px",
        "margin-mobile": "20px",
        "md": "16px"
      },
      fontFamily: {
        "label-bold": ["Inter"],
        "body-md": ["Inter"],
        "display-lg": ["Inter"],
        "headline-sm": ["Inter"],
        "label-sm": ["Inter"],
        "body-lg": ["Inter"],
        "headline-md": ["Inter"]
      },
      fontSize: {
        "label-bold": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }]
      }
    }
  }
};
