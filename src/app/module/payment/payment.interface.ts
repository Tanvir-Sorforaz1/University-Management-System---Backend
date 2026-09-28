export interface IInitiatePaymentPayload {
  feeId: string;
}

/** Query params bKash redirects the student's browser back with. */
export interface IBkashCallbackQuery {
  paymentID?: string;
  status?: "success" | "failure" | "cancel" | string;
  [key: string]: unknown;
}
