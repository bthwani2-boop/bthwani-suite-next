"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrollScreen = ScrollScreen;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const tokens_1 = require("../../tokens");
const StyledScrollView = (0, tamagui_compat_1.asUiComponent)(tamagui_1.ScrollView);
function ScrollScreen({ children, padded = true, gap = tokens_1.spacing[4], }) {
    return (<StyledScrollView style={{ flex: 1, backgroundColor: tokens_1.colorRoles.surfaceBase }} contentContainerStyle={{
            padding: padded ? tokens_1.spacing[4] : 0,
            paddingBottom: tokens_1.spacing[8],
            gap,
        }} showsVerticalScrollIndicator={false}>
      {children}
    </StyledScrollView>);
}
//# sourceMappingURL=ScrollScreen.js.map