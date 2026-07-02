"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.direction = void 0;
exports.isRtlLanguage = isRtlLanguage;
exports.resolveDirection = resolveDirection;
exports.resolveTextAlign = resolveTextAlign;
exports.resolveRowDirection = resolveRowDirection;
exports.direction = {
    defaultDirection: "rtl",
    defaultLanguage: "ar",
    rtlLanguages: ["ar", "fa", "he", "ur"],
    useLogicalProperties: true,
    mirrorDirectionalIcons: true
};
function isRtlLanguage(language) {
    const normalized = language.trim().toLowerCase();
    return exports.direction.rtlLanguages.some((candidate) => normalized === candidate || normalized.startsWith(`${candidate}-`));
}
function resolveDirection(language, fallback = exports.direction.defaultDirection) {
    if (!language)
        return fallback;
    return isRtlLanguage(language) ? "rtl" : "ltr";
}
function resolveTextAlign(value, activeDirection) {
    if (value === "center")
        return "center";
    if (value === "start")
        return activeDirection === "rtl" ? "right" : "left";
    return activeDirection === "rtl" ? "left" : "right";
}
function resolveRowDirection(direction) {
    return direction === "rtl" ? "row-reverse" : "row";
}
//# sourceMappingURL=direction.js.map