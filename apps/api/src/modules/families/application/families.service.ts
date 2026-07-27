import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  users,
  parents,
  familyAddresses,
  emergencyContacts,
  students,
  schools,
} from '../../../database/schemas';
import { eq, and, ne } from 'drizzle-orm';
import { NotFoundError, ConflictError, ValidationError } from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { normalizeIranianDigits } from '../../../common/iranian-national-id';
import {
  CreateFamilyDto,
  FamilyProfile,
  ParentProfile,
  AddressProfile,
} from '../domain/family.types';
import { parseEditableAddressFields } from '../domain/address-update';
import { InAppNotificationService } from '../../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class FamiliesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
  ) {}

  async createFamily(userId: string, dto: CreateFamilyDto): Promise<FamilyProfile> {
    const [account] = await this.db.db
      .select({ phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const primaryParent =
      account?.phoneNumber === dto.mother.phoneNumber
        ? 'MOTHER'
        : account?.phoneNumber === dto.father.phoneNumber
          ? 'FATHER'
          : null;
    if (!primaryParent) {
      throw new ConflictError(
        'LOGIN_PHONE_MUST_MATCH_PARENT',
        'The login phone number must match the father or mother phone number.',
      );
    }
    const existingMother = await this.db.db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.nationalId, dto.mother.nationalId))
      .limit(1);

    if (existingMother.length > 0) {
      throw new ConflictError(
        'DUPLICATE_NATIONAL_ID',
        'A parent with this national ID already exists.',
      );
    }

    const existingFather = await this.db.db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.nationalId, dto.father.nationalId))
      .limit(1);

    if (existingFather.length > 0) {
      throw new ConflictError(
        'DUPLICATE_NATIONAL_ID',
        'A parent with this national ID already exists.',
      );
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
        isPrimaryContact: primaryParent === 'MOTHER',
        phoneVerifiedAt: primaryParent === 'MOTHER' ? new Date() : null,
      },
      {
        id: fatherId,
        userId,
        parentType: 'FATHER',
        firstName: dto.father.firstName,
        lastName: dto.father.lastName,
        nationalId: dto.father.nationalId,
        phoneNumber: dto.father.phoneNumber,
        isPrimaryContact: primaryParent === 'FATHER',
        phoneVerifiedAt: primaryParent === 'FATHER' ? new Date() : null,
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
    const user = await this.db.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user.length === 0) throw new NotFoundError('User');

    const parentRecords = await this.db.db.select().from(parents).where(eq(parents.userId, userId));

    const addressRecords = await this.db.db
      .select()
      .from(familyAddresses)
      .where(eq(familyAddresses.userId, userId));

    const emergencyRecords = await this.db.db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));

    const mother = parentRecords.find((p) => p.parentType === 'MOTHER') || null;
    const father = parentRecords.find((p) => p.parentType === 'FATHER') || null;

    const mapParent = (p: (typeof parentRecords)[0]): ParentProfile => ({
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
      addresses: addressRecords.map((a) => ({
        id: a.id,
        title: a.title,
        province: a.province,
        city: a.city,
        district: a.district || undefined,
        streetAddress: a.streetAddress,
        postalCode: a.postalCode || undefined,
        isActive: a.isActive,
      })),
      emergencyContacts: emergencyRecords.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        relationship: e.relationship,
        phoneNumber: e.phoneNumber,
        isActive: e.isActive,
      })),
    };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      phoneNumber?: string;
      parentType?: string;
    },
  ): Promise<void> {
    if (data.parentType) {
      const existing = await this.db.db
        .select()
        .from(parents)
        .where(and(eq(parents.userId, userId), eq(parents.parentType, data.parentType)))
        .limit(1);

      if (existing.length === 0) throw new NotFoundError('Parent');

      const nationalId = data.nationalId
        ? normalizeIranianDigits(data.nationalId).trim()
        : existing[0].nationalId;
      const phoneNumber = data.phoneNumber
        ? normalizeIranianDigits(data.phoneNumber).trim()
        : existing[0].phoneNumber;
      if (!/^\d{1,20}$/.test(nationalId)) {
        throw new ValidationError('National ID must contain between 1 and 20 digits.');
      }
      if (!/^09\d{9}$/.test(phoneNumber)) {
        throw new ValidationError('Phone number must contain 11 digits and start with 09.');
      }
      const duplicate = await this.db.db
        .select({ id: parents.id })
        .from(parents)
        .where(and(eq(parents.nationalId, nationalId), ne(parents.id, existing[0].id)))
        .limit(1);
      if (duplicate[0]) {
        throw new ConflictError('DUPLICATE_NATIONAL_ID', 'This national ID is already in use.');
      }
      if (existing[0].isPrimaryContact && phoneNumber !== existing[0].phoneNumber) {
        const phoneOwner = await this.db.db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.phoneNumber, phoneNumber), ne(users.id, userId)))
          .limit(1);
        if (phoneOwner[0]) {
          throw new ConflictError('DUPLICATE_PHONE_NUMBER', 'This phone number is already in use.');
        }
      }

      await this.db.db.transaction(async (txn) => {
        await txn
          .update(parents)
          .set({
            firstName: data.firstName?.trim() || existing[0].firstName,
            lastName: data.lastName?.trim() || existing[0].lastName,
            nationalId,
            phoneNumber,
            phoneVerifiedAt:
              phoneNumber === existing[0].phoneNumber ? existing[0].phoneVerifiedAt : null,
            updatedAt: new Date(),
          })
          .where(eq(parents.id, existing[0].id));
        if (existing[0].isPrimaryContact && phoneNumber !== existing[0].phoneNumber) {
          await txn
            .update(users)
            .set({ phoneNumber, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
      });
      await this.notifications.create({
        userId,
        notificationType: 'PROFILE_UPDATED',
        title: 'اطلاعات والد به‌روزرسانی شد',
        message: `اطلاعات ${data.parentType === 'MOTHER' ? 'مادر' : 'پدر'} با موفقیت ذخیره شد.`,
        relatedEntityType: 'PARENT',
        relatedEntityId: existing[0].id,
      });
    }
  }

  async addAddress(
    userId: string,
    data: {
      title: string;
      province: string;
      city: string;
      district?: string;
      streetAddress: string;
      postalCode?: string;
    },
  ): Promise<AddressProfile> {
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

  async updateAddress(
    addressId: string,
    userId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.db.db
      .select()
      .from(familyAddresses)
      .where(and(eq(familyAddresses.id, addressId), eq(familyAddresses.userId, userId)))
      .limit(1);

    if (existing.length === 0) throw new NotFoundError('Address');

    const editableFields = parseEditableAddressFields(data);

    await this.db.db
      .update(familyAddresses)
      .set({ ...editableFields, updatedAt: new Date() })
      .where(eq(familyAddresses.id, addressId));
    await this.notifications.create({
      userId,
      notificationType: 'ADDRESS_UPDATED',
      title: 'نشانی به‌روزرسانی شد',
      message: 'نشانی فعال خانواده با موفقیت ذخیره شد.',
      relatedEntityType: 'ADDRESS',
      relatedEntityId: addressId,
    });
  }

  async setPrimaryPhone(userId: string, parentType: 'MOTHER' | 'FATHER'): Promise<void> {
    await this.db.db
      .update(parents)
      .set({ isPrimaryContact: false })
      .where(eq(parents.userId, userId));

    const target = await this.db.db
      .select()
      .from(parents)
      .where(and(eq(parents.userId, userId), eq(parents.parentType, parentType)))
      .limit(1);

    if (target.length === 0) throw new NotFoundError('Parent');

    await this.db.db
      .update(parents)
      .set({ isPrimaryContact: true, updatedAt: new Date() })
      .where(eq(parents.id, target[0].id));
    await this.db.db
      .update(users)
      .set({ phoneNumber: target[0].phoneNumber, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async markPhoneVerified(userId: string): Promise<void> {
    const primary = await this.db.db
      .select()
      .from(parents)
      .where(and(eq(parents.userId, userId), eq(parents.isPrimaryContact, true)))
      .limit(1);

    if (primary.length > 0) {
      await this.db.db
        .update(parents)
        .set({ phoneVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(parents.id, primary[0].id));
    }
  }

  async updateEmergencyContact(
    contactId: string,
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      relationship: string;
      phoneNumber: string;
    }>,
  ) {
    const existing = await this.db.db
      .select()
      .from(emergencyContacts)
      .where(and(eq(emergencyContacts.id, contactId), eq(emergencyContacts.userId, userId)))
      .limit(1);
    if (!existing[0]) throw new NotFoundError('Emergency contact', contactId);
    await this.db.db
      .update(emergencyContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emergencyContacts.id, contactId));
    await this.notifications.create({
      userId,
      notificationType: 'EMERGENCY_CONTACT_UPDATED',
      title: 'تماس اضطراری به‌روزرسانی شد',
      message: 'اطلاعات تماس اضطراری با موفقیت ذخیره شد.',
      relatedEntityType: 'EMERGENCY_CONTACT',
      relatedEntityId: contactId,
    });
  }

  async getAllForAdmin() {
    const [userRows, parentRows, studentRows] = await Promise.all([
      this.db.db.select().from(users),
      this.db.db.select().from(parents),
      this.db.db.select().from(students),
    ]);
    return userRows.map((user) => {
      const familyParents = parentRows.filter((parent) => parent.userId === user.id);
      const primary = familyParents.find((parent) => parent.isPrimaryContact) ?? familyParents[0];
      return {
        id: user.id,
        username: primary?.lastName ?? user.username,
        primaryPhone: primary?.phoneNumber ?? user.phoneNumber ?? null,
        studentCount: studentRows.filter(
          (student) => student.userId === user.id && student.isActive,
        ).length,
        status: user.accountStatus === 'ACTIVE' ? 'فعال' : 'غیرفعال',
        createdAt: user.createdAt.toISOString(),
      };
    });
  }

  async getForAdmin(userId: string) {
    const family = (await this.getAllForAdmin()).find(({ id }) => id === userId);
    if (!family) throw new NotFoundError('Family', userId);
    const studentRows = await this.db.db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        schoolName: schools.name,
        grade: students.grade,
        isActive: students.isActive,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(eq(students.userId, userId));
    const parentRows = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.userId, userId));
    return {
      ...family,
      parents: parentRows.map((parent) => ({
        id: parent.id,
        parentType: parent.parentType,
        firstName: parent.firstName,
        lastName: parent.lastName,
        nationalId: parent.nationalId,
        phoneNumber: parent.phoneNumber,
        isPrimaryContact: parent.isPrimaryContact,
      })),
      students: studentRows.map((student) => ({
        ...student,
        status: student.isActive ? 'فعال' : 'غیرفعال',
      })),
    };
  }

  async adminCreateParent(
    userId: string,
    data: {
      parentType: 'MOTHER' | 'FATHER';
      firstName: string;
      lastName: string;
      nationalId: string;
      phoneNumber: string;
      isPrimaryContact?: boolean;
    },
  ) {
    await this.getFamilyProfile(userId);
    const [sameType] = await this.db.db
      .select({ id: parents.id })
      .from(parents)
      .where(and(eq(parents.userId, userId), eq(parents.parentType, data.parentType)))
      .limit(1);
    if (sameType) {
      throw new ConflictError('PARENT_TYPE_EXISTS', 'This parent type already exists.');
    }
    const nationalId = normalizeIranianDigits(data.nationalId).trim();
    const phoneNumber = normalizeIranianDigits(data.phoneNumber).trim();
    if (!/^\d{1,20}$/.test(nationalId) || !/^09\d{9}$/.test(phoneNumber)) {
      throw new ValidationError('A valid national ID and Iranian mobile number are required.');
    }
    const [duplicate] = await this.db.db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.nationalId, nationalId))
      .limit(1);
    if (duplicate) throw new ConflictError('DUPLICATE_NATIONAL_ID', 'Parent already exists.');
    const id = generateId();
    await this.db.db.transaction(async (txn) => {
      if (data.isPrimaryContact) {
        await txn
          .update(parents)
          .set({ isPrimaryContact: false, updatedAt: new Date() })
          .where(eq(parents.userId, userId));
      }
      await txn.insert(parents).values({
        id,
        userId,
        parentType: data.parentType,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        nationalId,
        phoneNumber,
        isPrimaryContact: !!data.isPrimaryContact,
      });
      if (data.isPrimaryContact) {
        await txn.update(users).set({ phoneNumber, updatedAt: new Date() }).where(eq(users.id, userId));
      }
    });
    return { id };
  }

  async adminUpdateParent(
    userId: string,
    parentId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nationalId: string;
      phoneNumber: string;
      isPrimaryContact: boolean;
    }>,
  ) {
    const [existing] = await this.db.db
      .select()
      .from(parents)
      .where(and(eq(parents.id, parentId), eq(parents.userId, userId)))
      .limit(1);
    if (!existing) throw new NotFoundError('Parent', parentId);
    const nationalId = data.nationalId
      ? normalizeIranianDigits(data.nationalId).trim()
      : existing.nationalId;
    const phoneNumber = data.phoneNumber
      ? normalizeIranianDigits(data.phoneNumber).trim()
      : existing.phoneNumber;
    if (!/^\d{1,20}$/.test(nationalId) || !/^09\d{9}$/.test(phoneNumber)) {
      throw new ValidationError('A valid national ID and Iranian mobile number are required.');
    }
    await this.db.db.transaction(async (txn) => {
      if (data.isPrimaryContact) {
        await txn
          .update(parents)
          .set({ isPrimaryContact: false, updatedAt: new Date() })
          .where(eq(parents.userId, userId));
      }
      await txn
        .update(parents)
        .set({
          firstName: data.firstName?.trim() ?? existing.firstName,
          lastName: data.lastName?.trim() ?? existing.lastName,
          nationalId,
          phoneNumber,
          isPrimaryContact: data.isPrimaryContact ?? existing.isPrimaryContact,
          updatedAt: new Date(),
        })
        .where(eq(parents.id, parentId));
      if (data.isPrimaryContact || existing.isPrimaryContact) {
        await txn.update(users).set({ phoneNumber, updatedAt: new Date() }).where(eq(users.id, userId));
      }
    });
    return { updated: true };
  }

  async adminDeleteParent(userId: string, parentId: string) {
    const [existing] = await this.db.db
      .select()
      .from(parents)
      .where(and(eq(parents.id, parentId), eq(parents.userId, userId)))
      .limit(1);
    if (!existing) throw new NotFoundError('Parent', parentId);
    await this.db.db.delete(parents).where(eq(parents.id, parentId));
    const [replacement] = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.userId, userId))
      .limit(1);
    if (existing.isPrimaryContact && replacement) {
      await this.setPrimaryPhone(
        userId,
        replacement.parentType as 'MOTHER' | 'FATHER',
      );
    }
    return { deleted: true };
  }
}
