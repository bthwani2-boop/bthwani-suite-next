export declare const elevation: {
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
export type ElevationToken = keyof typeof elevation;
//# sourceMappingURL=elevation.d.ts.map