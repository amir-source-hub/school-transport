import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { schools } from '../../database/schemas';
import { and, asc, eq } from 'drizzle-orm';
import { NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';
import type { SchoolEducationOption } from '../../database/schemas/schools.schema';

export const SCHOOL_LIST_LIMIT = 500;

@Injectable()
export class SchoolsService {
  constructor(@Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService) {}

  async getAll(includeInactive = false) {
    if (includeInactive) {
      return this.db.db
        .select()
        .from(schools)
        .orderBy(asc(schools.name), asc(schools.id))
        .limit(SCHOOL_LIST_LIMIT);
    }
    return this.db.db
      .select({
        id: schools.id,
        name: schools.name,
        schoolType: schools.schoolType,
        genderType: schools.genderType,
        province: schools.province,
        city: schools.city,
        district: schools.district,
        address: schools.address,
        phoneNumber: schools.phoneNumber,
        openingTime: schools.openingTime,
        closingTime: schools.closingTime,
        closingTimes: schools.closingTimes,
        latitude: schools.latitude,
        longitude: schools.longitude,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(eq(schools.isActive, true))
      .orderBy(asc(schools.name), asc(schools.id))
      .limit(SCHOOL_LIST_LIMIT);
  }

  async getById(id: string) {
    const result = await this.db.db.select().from(schools).where(eq(schools.id, id)).limit(1);
    if (result.length === 0) throw new NotFoundError('School', id);
    return result[0];
  }

  async getPublicById(id: string) {
    const result = await this.db.db
      .select({
        id: schools.id,
        name: schools.name,
        schoolType: schools.schoolType,
        genderType: schools.genderType,
        province: schools.province,
        city: schools.city,
        district: schools.district,
        address: schools.address,
        phoneNumber: schools.phoneNumber,
        openingTime: schools.openingTime,
        closingTime: schools.closingTime,
        closingTimes: schools.closingTimes,
        latitude: schools.latitude,
        longitude: schools.longitude,
        educationOptions: schools.educationOptions,
      })
      .from(schools)
      .where(and(eq(schools.id, id), eq(schools.isActive, true)))
      .limit(1);
    if (result.length === 0) throw new NotFoundError('School', id);
    return result[0];
  }

  async create(data: {
    name: string;
    schoolType: string;
    genderType: string;
    province: string;
    city: string;
    district?: string;
    address: string;
    phoneNumber?: string;
    managerName?: string;
    managerPhone?: string;
    openingTime: string;
    closingTime: string;
    closingTimes?: string[];
    latitude?: number;
    longitude?: number;
    educationOptions?: SchoolEducationOption[];
  }) {
    const id = generateId();
    await this.db.db.insert(schools).values({
      id,
      ...data,
      district: data.district || null,
      phoneNumber: data.phoneNumber || null,
      managerName: data.managerName || null,
      managerPhone: data.managerPhone || null,
      educationOptions: data.educationOptions ?? [],
      closingTimes: data.closingTimes?.length ? data.closingTimes : [data.closingTime],
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
    return this.getById(id);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      schoolType: string;
      genderType: string;
      province: string;
      city: string;
      district: string;
      address: string;
      phoneNumber: string;
      managerName: string;
      managerPhone: string;
      openingTime: string;
      closingTime: string;
      closingTimes: string[];
      latitude: number;
      longitude: number;
      educationOptions: SchoolEducationOption[];
      isActive: boolean;
    }>,
  ) {
    await this.getById(id);
    const next = { ...data } as Record<string, unknown>;
    if ('phoneNumber' in data) next.phoneNumber = data.phoneNumber || null;
    if ('managerName' in data) next.managerName = data.managerName || null;
    if ('managerPhone' in data) next.managerPhone = data.managerPhone || null;
    await this.db.db
      .update(schools)
      .set({ ...(next as typeof data), updatedAt: new Date() })
      .where(eq(schools.id, id));
    return this.getById(id);
  }

  async archive(id: string) {
    return this.update(id, { isActive: false });
  }

  async unarchive(id: string) {
    return this.update(id, { isActive: true });
  }
}
