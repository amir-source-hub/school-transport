import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { users, parents, familyAddresses, emergencyContacts } from '../../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { CreateFamilyDto, FamilyProfile, ParentProfile, AddressProfile, EmergencyContactProfile } from '../domain/family.types';

@Injectable()
export class FamiliesService {
  constructor(private readonly db: DatabaseService) {}

  async createFamily(userId: string, dto: CreateFamilyDto): Promise<FamilyProfile> {
    const existingMother = await this.db.db.select({ id: parents.id })
      .from(parents)
      .where(eq(parents.nationalId, dto.mother.nationalId))
      .limit(1);

    if (existingMother.length > 0) {
      throw new ConflictError('DUPLICATE_NATIONAL_ID', 'A parent with this national ID already exists.');
    }

    const existingFather = await this.db.db.select({ id: parents.id })
      .from(parents)
      .where(eq(parents.nationalId, dto.father.nationalId))
      .limit(1);

    if (existingFather.length > 0) {
      throw new ConflictError('DUPLICATE_NATIONAL_ID', 'A parent with this national ID already exists.');
    }

    const motherId = generateId();
    const fatherId = generateId();

    await this.db.db.insert(parents).values([
      {
        id: motherId,
        userId,
        parentType: 'MOTHER',
        firstName: dto.mother.firstName,
        lastName: dto.mother.lastName,
        nationalId: dto.mother.nationalId,
        phoneNumber: dto.mother.phoneNumber,
        isPrimaryContact: dto.primaryParent === 'MOTHER',
      },
      {
        id: fatherId,
        userId,
        parentType: 'FATHER',
        firstName: dto.father.firstName,
        lastName: dto.father.lastName,
        nationalId: dto.father.nationalId,
        phoneNumber: dto.father.phoneNumber,
        isPrimaryContact: dto.primaryParent === 'FATHER',
      },
    ]);

    const addressId = generateId();
    await this.db.db.insert(familyAddresses).values({
      id: addressId,
      userId,
      title: dto.address.title,
      province: dto.address.province,
      city: dto.address.city,
      district: dto.address.district || null,
      streetAddress: dto.address.streetAddress,
      postalCode: dto.address.postalCode || null,
    });

    const emergencyId = generateId();
    await this.db.db.insert(emergencyContacts).values({
      id: emergencyId,
      userId,
      firstName: dto.emergencyContact.firstName,
      lastName: dto.emergencyContact.lastName,
      relationship: dto.emergencyContact.relationship,
      phoneNumber: dto.emergencyContact.phoneNumber,
    });

    return this.getFamilyProfile(userId);
  }

  async getFamilyProfile(userId: string): Promise<FamilyProfile> {
    const user = await this.db.db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) throw new NotFoundError('User');

    const parentRecords = await this.db.db.select()
      .from(parents)
      .where(eq(parents.userId, userId));

    const addressRecords = await this.db.db.select()
      .from(familyAddresses)
      .where(eq(familyAddresses.userId, userId));

    const emergencyRecords = await this.db.db.select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));

    const mother = parentRecords.find(p => p.parentType === 'MOTHER') || null;
    const father = parentRecords.find(p => p.parentType === 'FATHER') || null;

    const mapParent = (p: typeof parentRecords[0]): ParentProfile => ({
      id: p.id,
      parentType: p.parentType,
      firstName: p.firstName,
      lastName: p.lastName,
      nationalId: p.nationalId,
      phoneNumber: p.phoneNumber,
      isPrimaryContact: p.isPrimaryContact,
      phoneVerified: !!p.phoneVerifiedAt,
    });

    return {
      id: userId,
      username: user[0].username,
      mother: mother ? mapParent(mother) : null,
      father: father ? mapParent(father) : null,
      addresses: addressRecords.map(a => ({
        id: a.id,
        title: a.title,
        province: a.province,
        city: a.city,
        district: a.district || undefined,
        streetAddress: a.streetAddress,
        postalCode: a.postalCode || undefined,
        isActive: a.isActive,
      })),
      emergencyContacts: emergencyRecords.map(e => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        relationship: e.relationship,
        phoneNumber: e.phoneNumber,
        isActive: e.isActive,
      })),
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; parentType?: string }): Promise<void> {
    if (data.parentType) {
      const existing = await this.db.db.select()
        .from(parents)
        .where(and(
          eq(parents.userId, userId),
          eq(parents.parentType, data.parentType),
        ))
        .limit(1);

      if (existing.length === 0) throw new NotFoundError('Parent');

      await this.db.db.update(parents)
        .set({
          firstName: data.firstName || existing[0].firstName,
          lastName: data.lastName || existing[0].lastName,
          updatedAt: new Date(),
        })
        .where(eq(parents.id, existing[0].id));
    }
  }

  async addAddress(userId: string, data: {
    title: string;
    province: string;
    city: string;
    district?: string;
    streetAddress: string;
    postalCode?: string;
  }): Promise<AddressProfile> {
    const id = generateId();
    await this.db.db.insert(familyAddresses).values({
      id,
      userId,
      title: data.title,
      province: data.province,
      city: data.city,
      district: data.district || null,
      streetAddress: data.streetAddress,
      postalCode: data.postalCode || null,
    });

    return { id, ...data, isActive: true } as AddressProfile;
  }

  async updateAddress(addressId: string, userId: string, data: Partial<{
    title: string; streetAddress: string; province: string; city: string; district: string; postalCode: string;
  }>): Promise<void> {
    const existing = await this.db.db.select()
      .from(familyAddresses)
      .where(and(eq(familyAddresses.id, addressId), eq(familyAddresses.userId, userId)))
      .limit(1);

    if (existing.length === 0) throw new NotFoundError('Address');

    await this.db.db.update(familyAddresses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyAddresses.id, addressId));
  }

  async setPrimaryPhone(userId: string, parentType: 'MOTHER' | 'FATHER'): Promise<void> {
    await this.db.db.update(parents)
      .set({ isPrimaryContact: false })
      .where(eq(parents.userId, userId));

    const target = await this.db.db.select()
      .from(parents)
      .where(and(eq(parents.userId, userId), eq(parents.parentType, parentType)))
      .limit(1);

    if (target.length === 0) throw new NotFoundError('Parent');

    await this.db.db.update(parents)
      .set({ isPrimaryContact: true, updatedAt: new Date() })
      .where(eq(parents.id, target[0].id));
  }

  async markPhoneVerified(userId: string): Promise<void> {
    const primary = await this.db.db.select()
      .from(parents)
      .where(and(eq(parents.userId, userId), eq(parents.isPrimaryContact, true)))
      .limit(1);

    if (primary.length > 0) {
      await this.db.db.update(parents)
        .set({ phoneVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(parents.id, primary[0].id));
    }
  }
}
