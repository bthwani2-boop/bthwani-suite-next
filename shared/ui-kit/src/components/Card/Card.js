"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCard = void 0;
exports.Card = Card;
exports.InfoCard = InfoCard;
const react_1 = __importStar(require("react"));
const tamagui_1 = require("tamagui");
const colors_1 = require("../../tokens/colors");
const Surface_1 = require("../Surface");
const Text_1 = require("../Text");
const _shared_1 = require("../_shared");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const FlexYStack = (0, tamagui_compat_1.asUiComponent)(tamagui_1.YStack);
function Card({ interactive = false, title, subtitle, footer, children, ...props }) {
    return (<Surface_1.Surface tone="raised" {...(interactive
        ? {
            hoverStyle: { borderColor: "$action", y: -1 },
            pressStyle: { opacity: 0.92, y: 0 }
        }
        : {})} {...props}>
      <_shared_1.Block gap="$3" width="100%">
        {title || subtitle ? (<_shared_1.Block gap="$1">
            {title ? <Text_1.Text role="bodyStrong">{title}</Text_1.Text> : null}
            {subtitle ? <Text_1.Text role="bodySm" tone="secondary">{subtitle}</Text_1.Text> : null}
          </_shared_1.Block>) : null}
        {children}
        {footer ? (<_shared_1.Block width="100%">
            {footer}
          </_shared_1.Block>) : null}
      </_shared_1.Block>
    </Surface_1.Surface>);
}
function InfoCard({ icon, title }) {
    return (<Card padding="$3">
      <_shared_1.Inline gap="$3" width="100%">
        {icon}
        <Text_1.Text role="body" style={styles.infoText}>{title}</Text_1.Text>
      </_shared_1.Inline>
    </Card>);
}
exports.ProductCard = (0, react_1.memo)(function ProductCard({ title, imageSource, categoryLabel, price, isFavorited, onAdd, onFavorite, onImagePress, }) {
    const isNumericPrice = price?.value != null && !Number.isNaN(price.value);
    const priceStr = price?.label ?? (isNumericPrice ? `${price.value} ${price.currency ?? "د.ي"}` : "");
    return (<tamagui_1.YStack style={styles.productCard}>
      {/* Product Details (Left Side in LTR) */}
      <tamagui_1.YStack style={styles.productBody}>
        <Text_1.Text role="bodyStrong" style={styles.productTitle} numberOfLines={1}>
          {title}
        </Text_1.Text>

        {priceStr ? (<Text_1.Text role="body" style={styles.productPrice}>
            {priceStr}
          </Text_1.Text>) : null}

        {categoryLabel ? (<tamagui_1.YStack style={styles.productMetaBadge}>
            <Text_1.Text role="caption" style={styles.productCategoryText}>
              {categoryLabel}
            </Text_1.Text>
          </tamagui_1.YStack>) : null}
      </tamagui_1.YStack>

      {/* Product Image Zone (Right Side in LTR) */}
      <FlexYStack onPress={onImagePress} pressStyle={{ opacity: 0.95 }} style={styles.productImageWrap}>
        {/* Inner container to clip the image to rounded corners */}
        <tamagui_1.YStack style={styles.imageInnerContainer}>
          {imageSource ? (<tamagui_1.Image source={imageSource} style={styles.productImage}/>) : (<tamagui_1.YStack style={styles.productImagePlaceholder}/>)}
        </tamagui_1.YStack>

        {/* Favorite Heart Button (Top-Right of image zone, corner-hugging) */}
        {onFavorite ? (<FlexYStack onPress={onFavorite} pressStyle={{ opacity: 0.8 }} style={styles.productFavoriteButton}>
            <Text_1.Text role="body" style={[styles.heartIcon, isFavorited && styles.heartIconActive]}>
              {isFavorited ? "♥" : "♡"}
            </Text_1.Text>
          </FlexYStack>) : null}
      </FlexYStack>

      {/* Add to Cart Button (Bottom-Left of entire card, corner-hugging) */}
      {onAdd ? (<FlexYStack onPress={onAdd} pressStyle={{ opacity: 0.8 }} style={styles.productAddButton}>
          <Text_1.Text style={styles.cartBtnIcon}>🛒</Text_1.Text>
          {/* Small white circular badge containing an orange plus sign in top-left */}
          <tamagui_1.YStack style={styles.addPlusBadge}>
            <Text_1.Text style={styles.addPlusText}>+</Text_1.Text>
          </tamagui_1.YStack>
        </FlexYStack>) : null}
    </tamagui_1.YStack>);
});
const styles = {
    infoText: {
        flex: 1,
        textAlign: "right",
    },
    productCard: {
        direction: "ltr", // Force details on left, image on right
        width: "100%",
        height: 130,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "stretch",
        overflow: "hidden", // Clip image and badges inside card container
        padding: 0, // Flush to edges
        gap: 0,
        backgroundColor: colors_1.colorRoles.surfaceBase,
        borderWidth: 1,
        borderColor: "rgba(10, 47, 92, 0.08)",
        shadowColor: colors_1.colorRoles.brandStructure,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: 10,
        position: "relative",
    },
    productBody: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        justifyContent: "space-between", // Space items out vertically
        alignItems: "flex-end",
        position: "relative",
    },
    productTitle: {
        color: colors_1.colorRoles.brandStructure,
        fontSize: 16,
        fontFamily: "Outfit-Bold",
        fontWeight: "800",
        textAlign: "right",
    },
    productPrice: {
        color: colors_1.colorRoles.brandStructure,
        fontSize: 16,
        fontFamily: "Outfit-Bold",
        fontWeight: "900",
        textAlign: "right",
    },
    productMetaBadge: {
        backgroundColor: colors_1.colorPalette.grayBorder,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-end",
    },
    productCategoryText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors_1.colorRoles.textSecondary,
    },
    productImageWrap: {
        width: 176, // Match target image width ratio
        height: "100%",
        position: "relative",
    },
    imageInnerContainer: {
        width: "100%",
        height: "100%",
        borderTopRightRadius: 24, // Match card corner radius
        borderBottomRightRadius: 24,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        overflow: "hidden", // Clip image
        backgroundColor: colors_1.colorPalette.tanBg, // Sand placeholder color
    },
    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    productImagePlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: colors_1.colorPalette.tanBg,
    },
    productFavoriteButton: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 36,
        height: 36,
        borderTopRightRadius: 24, // Hugs top-right card corner radius
        borderBottomLeftRadius: 24,
        backgroundColor: colors_1.colorRoles.surfaceBase,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(10, 47, 92, 0.08)",
        shadowColor: colors_1.colorRoles.shadowBase,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 10,
    },
    heartIcon: {
        fontSize: 18,
        color: colors_1.colorRoles.brandAction,
    },
    heartIconActive: {
        color: colors_1.colorRoles.brandAction,
    },
    productAddButton: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 44,
        height: 36,
        borderBottomLeftRadius: 24, // Hugs bottom-left card corner radius
        borderTopRightRadius: 24,
        backgroundColor: colors_1.colorRoles.brandAction,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors_1.colorRoles.brandAction,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    cartBtnIcon: {
        color: colors_1.colorRoles.textInverse,
        fontSize: 16,
    },
    addPlusBadge: {
        position: "absolute",
        top: 2,
        left: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors_1.colorPalette.white,
        justifyContent: "center",
        alignItems: "center",
    },
    addPlusText: {
        color: colors_1.colorRoles.brandAction,
        fontSize: 9,
        fontWeight: "900",
        lineHeight: 11,
    },
};
//# sourceMappingURL=Card.js.map