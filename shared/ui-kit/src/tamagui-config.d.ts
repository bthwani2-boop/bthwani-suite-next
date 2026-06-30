import { createTamagui } from "tamagui";
export declare const tamaguiConfig: ReturnType<typeof createTamagui>;
export type TamaguiConfig = typeof tamaguiConfig;
declare module "tamagui" {
    interface TamaguiCustomConfig extends TamaguiConfig {
    }
}
export default tamaguiConfig;
//# sourceMappingURL=tamagui-config.d.ts.map