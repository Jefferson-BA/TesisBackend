export enum DiscountType {
  PERCENTAGE = 'percentage',               // % de descuento sobre el precio
  FIXED_AMOUNT = 'fixed_amount',           // Descuento fijo en dinero (ej: -$5)
  BUY_X_GET_DISCOUNT = 'buy_x_get_discount', // Compra X unidades → descuento %
}

export enum ApplyTo {
  PRODUCT = 'product',    // Solo el producto referenciado por productId
  CATEGORY = 'category',  // Todos los productos de la categoría referenciada
  ALL = 'all',            // Todo el menú (promo general)
}
