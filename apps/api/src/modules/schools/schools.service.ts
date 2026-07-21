import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { schools } from '../../database/schemas';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';

@Injectable()
export class SchoolsService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(includeInactive = false) {
    const query = this.db.db.select().from(schools);
    if (!includeInactive) {
      return query.where(eq(schools.isActive, true));
    }
    return query;
  }

  async getById(id: string) {
    const result = await this.db.db.select().from(schools).where(eq(schools.id, id)).limit(1);
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
  }) {
    const id = generateId();
    await this.db.db.insert(schools).values({
      id,
      ...data,
      district: data.district || null,
      phoneNumber: data.phoneNumber || null,
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
      isActive: boolean;
    }>,
  ) {
    await this.getById(id);
    await this.db.db
      .update(schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schools.id, id));
    return this.getById(id);
  }

  async archive(id: string) {
    return this.update(id, { isActive: false });
  }
}
