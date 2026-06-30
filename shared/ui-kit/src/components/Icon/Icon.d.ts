import React from 'react';
export type IconProps = {
    name: string;
    size?: number;
    tone?: 'brand' | 'success' | 'warning' | 'danger' | 'muted' | 'action';
    color?: string;
    style?: any;
    mirrored?: boolean;
};
export declare function Icon({ name, size, tone, color, style, mirrored }: IconProps): React.JSX.Element;
export default Icon;
//# sourceMappingURL=Icon.d.ts.map