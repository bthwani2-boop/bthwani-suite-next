import React from 'react';
export type TopBarProps = {
    title: string;
    subtitle?: string;
    variant?: 'primary' | 'secondary';
    onBack?: () => void;
    style?: any;
};
export declare function TopBar({ title, subtitle, variant, onBack, style }: TopBarProps): React.JSX.Element;
//# sourceMappingURL=TopBar.d.ts.map