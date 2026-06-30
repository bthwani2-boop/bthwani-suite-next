import React, { type ReactNode } from "react";
import { SurfaceProps } from "../Surface";
export type CardProps = SurfaceProps & {
    interactive?: boolean | undefined;
    title?: string | undefined;
    subtitle?: string | undefined;
    footer?: ReactNode | undefined;
};
export declare function Card({ interactive, title, subtitle, footer, children, ...props }: CardProps): React.JSX.Element;
export type InfoCardProps = {
    readonly icon?: ReactNode;
    readonly title: string;
};
export declare function InfoCard({ icon, title }: InfoCardProps): React.JSX.Element;
export type ProductCardPrice = {
    readonly value?: number;
    readonly label?: string;
    readonly currency?: string;
};
export type ProductCardProps = {
    readonly id: string;
    readonly title: string;
    readonly subtitle?: string;
    readonly imageSource?: {
        uri: string;
    } | number | null;
    readonly categoryLabel?: string;
    readonly preparationTime?: string;
    readonly price?: ProductCardPrice;
    readonly oldPrice?: ProductCardPrice;
    readonly isFavorited?: boolean;
    readonly onAdd?: () => void;
    readonly onFavorite?: () => void;
    readonly onImagePress?: () => void;
};
export declare const ProductCard: React.MemoExoticComponent<({ title, imageSource, categoryLabel, price, isFavorited, onAdd, onFavorite, onImagePress, }: ProductCardProps) => React.JSX.Element>;
//# sourceMappingURL=Card.d.ts.map