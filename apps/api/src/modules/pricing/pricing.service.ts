import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { registrationPrices, serviceRegistrations } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';

@Injectable()
export class PricingService {
  constructor(private readonly db: DatabaseService) {}

  async getByRegistration(registrationId: string) {
    return this.db.db.select()
      .from(registrationPrices)
      .where(eq(registrationPrices.registrationId, registrationId))
      .orderBy(registrationPrices.versionNumber);
  }

  async getLatest(registrationId: string) {
    const prices = await this.getByRegistration(registrationId);
    return prices.length > 0 ? prices[prices.length - 1] : null;
  }

  async create(registrationId: string, adminId: string, data: {
    totalAmount: number;
    currency?: string;
    fullPaymentAllowed?: boolean;
    installmentPaymentAllowed?: boolean;
    prepaymentAmount?: number;
    installmentCount?: number;
    description?: string;
  }) {
    const existing = await this.getLatest(registrationId);
    const versionNumber = existing ? existing.versionNumber + 1 : 1;

    if (existing && existing.priceStatus === 'ACCEPTED') {
      throw new ConflictError('PRICE_ALREADY_ACCEPTED', 'Price has already been accepted. Create a new contract version.');
    }

    const id = generateId();
    await this.db.db.insert(registrationPrices).values({
      id,
      registrationId,
      versionNumber,
      totalAmount: data.totalAmount,
      currency: data.currency || 'IRR',
      fullPaymentAllowed: data.fullPaymentAllowed ?? true,
      installmentPaymentAllowed: data.installmentPaymentAllowed ?? true,
      prepaymentAmount: data.prepaymentAmount || 0,
      installmentCount: data.installmentCount || 4,
      priceStatus: 'OFFERED',
      setByAdminId: adminId,
    });

    if (existing && existing.priceStatus !== 'ACCEPTED') {
      await this.db.db.update(registrationPrices)
        .set({ priceStatus: 'REPLACED', replacedByPriceId: id, updatedAt: new Date() })
        .where(eq(registrationPrices.id, existing.id));
    }

    return this.getByRegistration(registrationId);
  }

  async acceptPrice(priceId: string, userId: string) {
    const price = await this.db.db.select()
      .from(registrationPrices)
      .where(eq(registrationPrices.id, priceId))
      .limit(1);

    if (price.length === 0) throw new NotFoundError('Price');
    if (price[0].priceStatus !== 'OFFERED') {
      throw new ValidationError('This price is not available for acceptance.');
    }

    const reg = await this.db.db.select()
      .from(serviceRegistrations)
      .where(eq(serviceRegistrations.id, price[0].registrationId))
      .limit(1);

    if (reg.length === 0) throw new NotFoundError('Registration');
    if (reg[0].registrationStatus !== 'APPROVED') {
      throw new ValidationError('Registration must be approved before accepting a price.');
    }

    await this.db.db.update(registrationPrices)
      .set({ priceStatus: 'ACCEPTED', parentConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(registrationPrices.id, priceId));

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_PENDING', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, reg[0].id));

    return priceId;
  }
}
