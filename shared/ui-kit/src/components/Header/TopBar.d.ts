import React from 'react';
export type TopBarProps = {
    title: string;
    subtitle?: string | undefined;
    variant?: 'primary' | 'secondary' | undefined;
    onBack?: (() => void) | undefined;
    style?: any;
};
export declare function TopBar({ title, subtitle, variant, onBack, style }: TopBarProps): React.JSX.Element;
//# sourceMappingURL=TopBar.d.ts.map
