// Integration contract for a future official payment provider.
// No implementation is activated without merchant credentials and verified webhooks.
export interface PaymentProvider {
  createPayment(order: { id: string; courseId: string; amountRub: number; returnUrl: string }): Promise<{ providerPaymentId: string; checkoutUrl: string }>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<{ orderId: string; providerPaymentId: string; status: 'paid' | 'failed' | 'pending'; amountRub: number }>;
}
export const paymentIntegrationStatus = 'not-connected' as const;
