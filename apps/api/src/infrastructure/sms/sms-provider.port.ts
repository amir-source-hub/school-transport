export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export type SmsSendResult = {
  providerMessageId: string;
  status: number;
};

export interface SmsProvider {
  send(input: {
    phoneNumber: string;
    message: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<SmsSendResult>;
}
