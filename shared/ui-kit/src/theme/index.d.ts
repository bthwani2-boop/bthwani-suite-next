export declare const themes: {
    readonly light: {
        readonly background: "#FFFCF8";
        readonly backgroundAlt: "#FFFFFF";
        readonly surface: "#FFFFFF";
        readonly surfaceRaised: "#FFFCF8";
        readonly surfaceInset: "#F8F5F0";
        readonly surfaceOverlay: string;
        readonly color: "#0A2F5C";
        readonly colorSecondary: "#275F96";
        readonly colorMuted: string;
        readonly colorInverse: "#FFFFFF";
        readonly borderColor: string;
        readonly borderColorStrong: string;
        readonly focusColor: string;
        readonly action: "#FF500D";
        readonly actionHover: "#E5480C";
        readonly actionPressed: "#B73809";
        readonly actionSoft: "#FFF3ED";
        readonly structure: "#0A2F5C";
        readonly structureSoft: "#EEF5FC";
        readonly success: "#1F8B4C";
        readonly successSoft: "#ECFDF3";
        readonly warning: "#B96A06";
        readonly warningSoft: "#FFFBEB";
        readonly danger: "#C43B35";
        readonly dangerSoft: "#FEF2F2";
        readonly info: "#295FAA";
        readonly infoSoft: "#EFF6FF";
        readonly shadowColor: "#000000";
    };
    readonly dark: {
        readonly background: "#020617";
        readonly backgroundAlt: "#0F172A";
        readonly surface: "#0F172A";
        readonly surfaceRaised: "#1E293B";
        readonly surfaceInset: "#020617";
        readonly surfaceOverlay: string;
        readonly color: "#F8FAFC";
        readonly colorSecondary: "#E2E8F0";
        readonly colorMuted: "#94A3B8";
        readonly colorInverse: "#0A2F5C";
        readonly borderColor: string;
        readonly borderColorStrong: string;
        readonly focusColor: string;
        readonly action: "#FF500D";
        readonly actionHover: "#FF7138";
        readonly actionPressed: "#FF9A6B";
        readonly actionSoft: string;
        readonly structure: "#F8FAFC";
        readonly structureSoft: "#1E293B";
        readonly success: "#4ADE80";
        readonly successSoft: string;
        readonly warning: "#F5C04E";
        readonly warningSoft: string;
        readonly danger: "#F2877A";
        readonly dangerSoft: string;
        readonly info: "#8BB4E8";
        readonly infoSoft: string;
        readonly shadowColor: "#000000";
    };
};
export declare const themeKernel: {
    readonly themes: {
        readonly light: {
            readonly background: "#FFFCF8";
            readonly backgroundAlt: "#FFFFFF";
            readonly surface: "#FFFFFF";
            readonly surfaceRaised: "#FFFCF8";
            readonly surfaceInset: "#F8F5F0";
            readonly surfaceOverlay: string;
            readonly color: "#0A2F5C";
            readonly colorSecondary: "#275F96";
            readonly colorMuted: string;
            readonly colorInverse: "#FFFFFF";
            readonly borderColor: string;
            readonly borderColorStrong: string;
            readonly focusColor: string;
            readonly action: "#FF500D";
            readonly actionHover: "#E5480C";
            readonly actionPressed: "#B73809";
            readonly actionSoft: "#FFF3ED";
            readonly structure: "#0A2F5C";
            readonly structureSoft: "#EEF5FC";
            readonly success: "#1F8B4C";
            readonly successSoft: "#ECFDF3";
            readonly warning: "#B96A06";
            readonly warningSoft: "#FFFBEB";
            readonly danger: "#C43B35";
            readonly dangerSoft: "#FEF2F2";
            readonly info: "#295FAA";
            readonly infoSoft: "#EFF6FF";
            readonly shadowColor: "#000000";
        };
        readonly dark: {
            readonly background: "#020617";
            readonly backgroundAlt: "#0F172A";
            readonly surface: "#0F172A";
            readonly surfaceRaised: "#1E293B";
            readonly surfaceInset: "#020617";
            readonly surfaceOverlay: string;
            readonly color: "#F8FAFC";
            readonly colorSecondary: "#E2E8F0";
            readonly colorMuted: "#94A3B8";
            readonly colorInverse: "#0A2F5C";
            readonly borderColor: string;
            readonly borderColorStrong: string;
            readonly focusColor: string;
            readonly action: "#FF500D";
            readonly actionHover: "#FF7138";
            readonly actionPressed: "#FF9A6B";
            readonly actionSoft: string;
            readonly structure: "#F8FAFC";
            readonly structureSoft: "#1E293B";
            readonly success: "#4ADE80";
            readonly successSoft: string;
            readonly warning: "#F5C04E";
            readonly warningSoft: string;
            readonly danger: "#F2877A";
            readonly dangerSoft: string;
            readonly info: "#8BB4E8";
            readonly infoSoft: string;
            readonly shadowColor: "#000000";
        };
    };
    readonly spacing: {
        readonly 0: 0;
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 8: 32;
        readonly 10: 40;
        readonly 12: 48;
        readonly 14: 56;
        readonly 16: 64;
        readonly 20: 80;
        readonly 24: 96;
    };
    readonly radius: {
        readonly none: 0;
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 16;
        readonly xl: 20;
        readonly "2xl": 24;
        readonly round: 999;
    };
    readonly elevation: {
        readonly flat: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0;
            readonly shadowRadius: 0;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly elevation: 0;
        };
        readonly raised: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.06;
            readonly shadowRadius: 10;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 2;
            };
            readonly elevation: 2;
        };
        readonly overlay: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.09;
            readonly shadowRadius: 18;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 6;
            };
            readonly elevation: 6;
        };
        readonly floating: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.12;
            readonly shadowRadius: 28;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 10;
            };
            readonly elevation: 10;
        };
    };
    readonly motion: {
        readonly duration: {
            readonly instant: 0;
            readonly quick: 120;
            readonly standard: 180;
            readonly calm: 240;
            readonly emphasized: 320;
        };
        readonly easing: {
            readonly standard: "ease-in-out";
            readonly enter: "ease-out";
            readonly exit: "ease-in";
            readonly linear: "linear";
        };
        readonly reducedMotionDuration: 0;
    };
    readonly sizing: {
        readonly controlXs: 32;
        readonly controlSm: 36;
        readonly controlMd: 44;
        readonly controlLg: 52;
        readonly controlXl: 60;
        readonly iconSm: 16;
        readonly iconMd: 20;
        readonly iconLg: 24;
        readonly iconXl: 32;
        readonly avatarSm: 28;
        readonly avatarMd: 40;
        readonly avatarLg: 56;
        readonly contentNarrow: 640;
        readonly contentDefault: 960;
        readonly contentWide: 1280;
    };
    readonly breakpoints: {
        readonly xs: 0;
        readonly sm: 480;
        readonly md: 768;
        readonly lg: 1024;
        readonly xl: 1280;
        readonly wide: 1440;
    };
    readonly typography: {
        readonly display: {
            readonly fontSize: 36;
            readonly lineHeight: 44;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.4;
        };
        readonly hero: {
            readonly fontSize: 30;
            readonly lineHeight: 38;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.3;
        };
        readonly titleLg: {
            readonly fontSize: 24;
            readonly lineHeight: 32;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.2;
        };
        readonly titleMd: {
            readonly fontSize: 20;
            readonly lineHeight: 28;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly titleSm: {
            readonly fontSize: 18;
            readonly lineHeight: 26;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly bodyLg: {
            readonly fontSize: 17;
            readonly lineHeight: 27;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly body: {
            readonly fontSize: 15;
            readonly lineHeight: 24;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly bodyStrong: {
            readonly fontSize: 15;
            readonly lineHeight: 24;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly bodySm: {
            readonly fontSize: 14;
            readonly lineHeight: 21;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly label: {
            readonly fontSize: 13;
            readonly lineHeight: 18;
            readonly fontWeight: "600";
            readonly letterSpacing: 0.1;
        };
        readonly caption: {
            readonly fontSize: 12;
            readonly lineHeight: 17;
            readonly fontWeight: "500";
            readonly letterSpacing: 0.1;
        };
        readonly code: {
            readonly fontSize: 13;
            readonly lineHeight: 19;
            readonly fontWeight: "500";
            readonly letterSpacing: 0;
        };
    };
    readonly fontFamilies: {
        readonly arabic: "system-ui";
        readonly latin: "system-ui";
        readonly display: "system-ui";
        readonly mono: "ui-monospace";
    };
    readonly fontWeights: {
        readonly regular: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
        readonly black: "800";
    };
    readonly borders: {
        readonly none: 0;
        readonly hairline: 1;
        readonly strong: 2;
    };
    readonly opacity: {
        readonly invisible: 0;
        readonly disabled: 0.48;
        readonly muted: 0.64;
        readonly subtle: 0.72;
        readonly pressed: 0.88;
        readonly opaque: 1;
        readonly backdrop: 0.44;
    };
    readonly zIndex: {
        readonly base: 0;
        readonly raised: 10;
        readonly dropdown: 100;
        readonly sticky: 200;
        readonly overlay: 300;
        readonly modal: 400;
        readonly toast: 500;
    };
    readonly direction: {
        readonly defaultDirection: import("..").Direction;
        readonly defaultLanguage: "ar";
        readonly rtlLanguages: readonly ["ar", "fa", "he", "ur"];
        readonly useLogicalProperties: true;
        readonly mirrorDirectionalIcons: true;
    };
};
export declare const theme: {
    readonly themes: {
        readonly light: {
            readonly background: "#FFFCF8";
            readonly backgroundAlt: "#FFFFFF";
            readonly surface: "#FFFFFF";
            readonly surfaceRaised: "#FFFCF8";
            readonly surfaceInset: "#F8F5F0";
            readonly surfaceOverlay: string;
            readonly color: "#0A2F5C";
            readonly colorSecondary: "#275F96";
            readonly colorMuted: string;
            readonly colorInverse: "#FFFFFF";
            readonly borderColor: string;
            readonly borderColorStrong: string;
            readonly focusColor: string;
            readonly action: "#FF500D";
            readonly actionHover: "#E5480C";
            readonly actionPressed: "#B73809";
            readonly actionSoft: "#FFF3ED";
            readonly structure: "#0A2F5C";
            readonly structureSoft: "#EEF5FC";
            readonly success: "#1F8B4C";
            readonly successSoft: "#ECFDF3";
            readonly warning: "#B96A06";
            readonly warningSoft: "#FFFBEB";
            readonly danger: "#C43B35";
            readonly dangerSoft: "#FEF2F2";
            readonly info: "#295FAA";
            readonly infoSoft: "#EFF6FF";
            readonly shadowColor: "#000000";
        };
        readonly dark: {
            readonly background: "#020617";
            readonly backgroundAlt: "#0F172A";
            readonly surface: "#0F172A";
            readonly surfaceRaised: "#1E293B";
            readonly surfaceInset: "#020617";
            readonly surfaceOverlay: string;
            readonly color: "#F8FAFC";
            readonly colorSecondary: "#E2E8F0";
            readonly colorMuted: "#94A3B8";
            readonly colorInverse: "#0A2F5C";
            readonly borderColor: string;
            readonly borderColorStrong: string;
            readonly focusColor: string;
            readonly action: "#FF500D";
            readonly actionHover: "#FF7138";
            readonly actionPressed: "#FF9A6B";
            readonly actionSoft: string;
            readonly structure: "#F8FAFC";
            readonly structureSoft: "#1E293B";
            readonly success: "#4ADE80";
            readonly successSoft: string;
            readonly warning: "#F5C04E";
            readonly warningSoft: string;
            readonly danger: "#F2877A";
            readonly dangerSoft: string;
            readonly info: "#8BB4E8";
            readonly infoSoft: string;
            readonly shadowColor: "#000000";
        };
    };
    readonly spacing: {
        readonly 0: 0;
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 8: 32;
        readonly 10: 40;
        readonly 12: 48;
        readonly 14: 56;
        readonly 16: 64;
        readonly 20: 80;
        readonly 24: 96;
    };
    readonly radius: {
        readonly none: 0;
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 16;
        readonly xl: 20;
        readonly "2xl": 24;
        readonly round: 999;
    };
    readonly elevation: {
        readonly flat: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0;
            readonly shadowRadius: 0;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 0;
            };
            readonly elevation: 0;
        };
        readonly raised: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.06;
            readonly shadowRadius: 10;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 2;
            };
            readonly elevation: 2;
        };
        readonly overlay: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.09;
            readonly shadowRadius: 18;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 6;
            };
            readonly elevation: 6;
        };
        readonly floating: {
            readonly shadowColor: "#000000";
            readonly shadowOpacity: 0.12;
            readonly shadowRadius: 28;
            readonly shadowOffset: {
                readonly width: 0;
                readonly height: 10;
            };
            readonly elevation: 10;
        };
    };
    readonly motion: {
        readonly duration: {
            readonly instant: 0;
            readonly quick: 120;
            readonly standard: 180;
            readonly calm: 240;
            readonly emphasized: 320;
        };
        readonly easing: {
            readonly standard: "ease-in-out";
            readonly enter: "ease-out";
            readonly exit: "ease-in";
            readonly linear: "linear";
        };
        readonly reducedMotionDuration: 0;
    };
    readonly sizing: {
        readonly controlXs: 32;
        readonly controlSm: 36;
        readonly controlMd: 44;
        readonly controlLg: 52;
        readonly controlXl: 60;
        readonly iconSm: 16;
        readonly iconMd: 20;
        readonly iconLg: 24;
        readonly iconXl: 32;
        readonly avatarSm: 28;
        readonly avatarMd: 40;
        readonly avatarLg: 56;
        readonly contentNarrow: 640;
        readonly contentDefault: 960;
        readonly contentWide: 1280;
    };
    readonly breakpoints: {
        readonly xs: 0;
        readonly sm: 480;
        readonly md: 768;
        readonly lg: 1024;
        readonly xl: 1280;
        readonly wide: 1440;
    };
    readonly typography: {
        readonly display: {
            readonly fontSize: 36;
            readonly lineHeight: 44;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.4;
        };
        readonly hero: {
            readonly fontSize: 30;
            readonly lineHeight: 38;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.3;
        };
        readonly titleLg: {
            readonly fontSize: 24;
            readonly lineHeight: 32;
            readonly fontWeight: "700";
            readonly letterSpacing: -0.2;
        };
        readonly titleMd: {
            readonly fontSize: 20;
            readonly lineHeight: 28;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly titleSm: {
            readonly fontSize: 18;
            readonly lineHeight: 26;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly bodyLg: {
            readonly fontSize: 17;
            readonly lineHeight: 27;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly body: {
            readonly fontSize: 15;
            readonly lineHeight: 24;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly bodyStrong: {
            readonly fontSize: 15;
            readonly lineHeight: 24;
            readonly fontWeight: "600";
            readonly letterSpacing: 0;
        };
        readonly bodySm: {
            readonly fontSize: 14;
            readonly lineHeight: 21;
            readonly fontWeight: "400";
            readonly letterSpacing: 0;
        };
        readonly label: {
            readonly fontSize: 13;
            readonly lineHeight: 18;
            readonly fontWeight: "600";
            readonly letterSpacing: 0.1;
        };
        readonly caption: {
            readonly fontSize: 12;
            readonly lineHeight: 17;
            readonly fontWeight: "500";
            readonly letterSpacing: 0.1;
        };
        readonly code: {
            readonly fontSize: 13;
            readonly lineHeight: 19;
            readonly fontWeight: "500";
            readonly letterSpacing: 0;
        };
    };
    readonly fontFamilies: {
        readonly arabic: "system-ui";
        readonly latin: "system-ui";
        readonly display: "system-ui";
        readonly mono: "ui-monospace";
    };
    readonly fontWeights: {
        readonly regular: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
        readonly black: "800";
    };
    readonly borders: {
        readonly none: 0;
        readonly hairline: 1;
        readonly strong: 2;
    };
    readonly opacity: {
        readonly invisible: 0;
        readonly disabled: 0.48;
        readonly muted: 0.64;
        readonly subtle: 0.72;
        readonly pressed: 0.88;
        readonly opaque: 1;
        readonly backdrop: 0.44;
    };
    readonly zIndex: {
        readonly base: 0;
        readonly raised: 10;
        readonly dropdown: 100;
        readonly sticky: 200;
        readonly overlay: 300;
        readonly modal: 400;
        readonly toast: 500;
    };
    readonly direction: {
        readonly defaultDirection: import("..").Direction;
        readonly defaultLanguage: "ar";
        readonly rtlLanguages: readonly ["ar", "fa", "he", "ur"];
        readonly useLogicalProperties: true;
        readonly mirrorDirectionalIcons: true;
    };
};
export type ThemeName = keyof typeof themes;
export type UiTheme = (typeof themes)[ThemeName];
export type ThemeKernel = typeof themeKernel;
//# sourceMappingURL=index.d.ts.map