"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevation = void 0;
const colors_1 = require("./colors");
exports.elevation = {
    flat: {
        shadowColor: colors_1.colorRoles.shadowBase,
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0
    },
    raised: {
        shadowColor: colors_1.colorRoles.shadowBase,
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2
    },
    overlay: {
        shadowColor: colors_1.colorRoles.shadowBase,
        shadowOpacity: 0.09,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6
    },
    floating: {
        shadowColor: colors_1.colorRoles.shadowBase,
        shadowOpacity: 0.12,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10
    }
};
//# sourceMappingURL=elevation.js.map