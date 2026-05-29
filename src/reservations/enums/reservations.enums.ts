export enum ReservationStatus {
  PENDING_REVIEW = 'pending_review', // El cliente la envió, el admin debe revisar disponibilidad
  APPROVED = 'approved',             // El admin dio el visto bueno, el cliente ya puede pagar
  DEPOSIT_PAID = 'deposit_paid',     // Pagó el adelanto (ej. 50%) si aplica
  FULLY_PAID = 'fully_paid',         // Evento pagado al 100%
  COMPLETED = 'completed',           // El evento ya se realizó con éxito
  CANCELLED = 'cancelled',           // Cancelado por el cliente o admin
}