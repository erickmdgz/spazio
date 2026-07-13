/**
 * PaymentGateway — single PCI-compliant COP capture (ADR-003) with the Spazio
 * operating entity as merchant of record (ADR-004). NO split settlement in the
 * pilot: the operator pays suppliers manually (manual payout). Commission is 10%
 * reconciled manually (ADR-007).
 *
 * No real vendor is wired in the pilot; the dev implementation fakes a capture.
 */

export interface CaptureInput {
  orderId: string;
  amountCop: number;
  currency: "COP";
  contactEmail: string;
}

export interface CaptureResult {
  status: "captured" | "failed";
  /** External gateway transaction reference (placeholder in the pilot). */
  reference: string;
}

export interface PaymentGateway {
  /** Capture a single payment in COP. Split settlement is out of scope (ADR-003/004). */
  capture(input: CaptureInput): Promise<CaptureResult>;
  /**
   * Manual-payout note: in the pilot there is no automated supplier payout. This
   * records the intent for the operator to settle suppliers by hand (ADR-003/004).
   */
  notePayout(orderId: string): Promise<void>;
}

/** Fake gateway for the pilot/dev. Always succeeds; no external call. */
export class FakePaymentGateway implements PaymentGateway {
  async capture(input: CaptureInput): Promise<CaptureResult> {
    return {
      status: "captured",
      reference: `fake_capture_${input.orderId}`,
    };
  }

  async notePayout(_orderId: string): Promise<void> {
    // Pilot: manual payout — nothing to do automatically (ADR-003/004).
  }
}
