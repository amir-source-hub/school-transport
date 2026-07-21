export const OTP_DELIVERY = Symbol('OTP_DELIVERY');

export interface OtpDelivery {
  send(input: { phoneNumber: string; purpose: string; code: string }): Promise<void>;
}
