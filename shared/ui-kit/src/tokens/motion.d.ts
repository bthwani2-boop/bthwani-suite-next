export declare const motion: {
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
export type MotionToken = keyof typeof motion.duration;
export type MotionEasingToken = keyof typeof motion.easing;
//# sourceMappingURL=motion.d.ts.map