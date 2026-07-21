import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { contracts, serviceRegistrations, registrationPrices, paymentPlans } from '../../database/schemas';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors';
import { generateId, generateContractNumber } from '../../common/utils';

@Injectable()
export class ContractsService {
  constructor(private readonly db: DatabaseService) {}

  async getByFamily(userId: string) {
    return this.db.db.select().from(contracts);
  }

  async getById(contractId: string) {
    const result = await this.db.db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
    if (result.length === 0) throw new NotFoundError('Contract', contractId);
    return result[0];
  }

  async generate(enrollmentId: string, adminId: string) {
    const reg = await this.db.db.select()
      .from(serviceRegistrations)
      .where(eq(serviceRegistrations.id, enrollmentId))
      .limit(1);
    if (reg.length === 0) throw new NotFoundError('Registration', enrollmentId);

    if (reg[0].registrationStatus !== 'APPROVED' && reg[0].registrationStatus !== 'CONTRACT_PENDING') {
      throw new ValidationError('Registration must be approved before generating a contract.');
    }

    if (!reg[0].selectedAddressId) {
      throw new ValidationError('A pickup address must be selected before contract generation.');
    }

    const price = await this.db.db.select()
      .from(registrationPrices)
      .where(and(
        eq(registrationPrices.registrationId, enrollmentId),
        eq(registrationPrices.priceStatus, 'ACCEPTED'),
      ))
      .limit(1);
    if (price.length === 0) throw new NotFoundError('Accepted price');

    const contractId = generateId();
    const contractNumber = generateContractNumber();

    await this.db.db.insert(contracts).values({
      id: contractId,
      registrationId: enrollmentId,
      registrationPriceId: price[0].id,
      contractNumber,
      contractStatus: 'GENERATED',
      selectedAddressId: reg[0].selectedAddressId,
      generatedByAdminId: adminId,
      generatedAt: new Date(),
      contractDataSnapshot: JSON.stringify({ price: price[0] }),
    });

    await this.db.db.update(serviceRegistrations)
      .set({ registrationStatus: 'CONTRACT_READY', updatedAt: new Date() })
      .where(eq(serviceRegistrations.id, enrollmentId));

    return this.getById(contractId);
  }

  async accept(contractId: string, userId: string) {
    const contract = await this.getById(contractId);

    if (contract.contractStatus !== 'GENERATED') {
      throw new ValidationError('Contract cannot be accepted in its current state.');
    }

    const plan = await this.db.db.select()
      .from(paymentPlans)
      .where(eq(paymentPlans.registrationPriceId, contract.registrationPriceId))
      .limit(1);

    if (plan.length === 0) {
      throw new ValidationError('Payment plan must be created before accepting the contract.');
    }

    await this.db.db.update(contracts)
      .set({
        contractStatus: 'ACCEPTED',
        acceptedAt: new Date(),
        paymentPlanId: plan[0].id,
      })
      .where(eq(contracts.id, contractId));

    return this.getById(contractId);
  }

  async reject(contractId: string) {
    const contract = await this.getById(contractId);
    if (contract.contractStatus !== 'GENERATED') {
      throw new ValidationError('Contract cannot be rejected in its current state.');
    }
    await this.db.db.update(contracts)
      .set({ contractStatus: 'REJECTED' })
      .where(eq(contracts.id, contractId));
    return this.getById(contractId);
  }
}
