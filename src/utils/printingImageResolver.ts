type MaybeImage = string | { src?: string; url?: string; source_url?: string } | null | undefined;

const toImageSrc = (value: MaybeImage): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return (value.src || value.url || value.source_url || '').trim();
};

// Returns the best image for an order line item.
// Priority: variation_image (color-specific) → item.image → product_image (main fallback)
export const resolveLineItemImage = (item: any): string => {
  if (!item) return '';

  const variationImage = toImageSrc(item.variation_image);
  const primaryImage   = toImageSrc(item.image);
  const productImage   = toImageSrc(item.product_image);

  return variationImage || primaryImage || productImage;
};
