import type { StoreAssortment } from "./central-catalog.types";

/**
 * Mappers and override resolvers for store assortments.
 */
export class StoreAssortmentAdapter {
  constructor(private readonly items: readonly StoreAssortment[]) {}

  findByProductId(productId: string): StoreAssortment | undefined {
    return this.items.find((a) => a.masterProductId === productId);
  }

  isProductVisible(productId: string): boolean {
    const a = this.findByProductId(productId);
    return a ? a.publicationStatus === "client_visible" && a.available : false;
  }

  getProductPrice(productId: string, fallbackPrice = 0): number {
    const a = this.findByProductId(productId);
    return a ? a.unitPrice : fallbackPrice;
  }
}
