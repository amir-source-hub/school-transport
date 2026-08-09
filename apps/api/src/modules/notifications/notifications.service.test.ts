import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { NotificationsService } from './notifications.service';

type Rows = unknown[];

function thenable(rows: Rows) {
  return {
    then(resolve: (value: Rows) => unknown) {
      return Promise.resolve(rows).then(resolve);
    },
  };
}

function makeQuery(rows: Rows) {
  const chain: Record<string, unknown> = {};
  const steps = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then(resolve: (value: Rows) => unknown) {
      return Promise.resolve(rows).then(resolve);
    },
  };
  Object.assign(chain, steps);
  return chain;
}

function makeDb(selectResults: Rows[]) {
  const select = vi.fn(() => makeQuery(selectResults.shift() ?? []));
  const returningRows: Rows = [];
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => thenable(returningRows)),
      })),
    })),
  }));
  const insert = vi.fn();
  const db = { select, update, insert } as unknown as DatabaseService['db'];
  return { database: { db } as unknown as DatabaseService, select, update, insert, returningRows };
}

function makeService(database: DatabaseService) {
  return new NotificationsService(database, {} as never);
}

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  eventId: 'event-1',
  userId: 'user-1',
  notificationType: 'LIMIT_REQUEST_CREATED',
  channel: 'IN_APP',
  purpose: 'SERVICE_NOTICE',
  title: 'title',
  message: 'message',
  relatedEntityType: 'STUDENT_LIMIT_REQUEST',
  relatedEntityId: 'related-1',
  notificationStatus: 'SENT',
  sentAt: new Date('2026-08-01T10:00:00Z'),
  readAt: null,
  createdAt: new Date('2026-08-01T10:00:00Z'),
  updatedAt: new Date('2026-08-01T10:00:00Z'),
  ...overrides,
});

describe('NotificationsService verification', () => {
  it('GET list is read-only and uses stable createdAt DESC, id DESC ordering', async () => {
    const { database, select, insert } = makeDb([[item()], [{ value: 1 }]]);
    const service = makeService(database);
    const result = await service.getByUser('user-1', { page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(insert).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledTimes(2);
    const itemsQuery = select.mock.results[0].value;
    expect(itemsQuery.orderBy).toHaveBeenCalledTimes(1);
  });

  it('caps page size at the documented maximum', async () => {
    const { database } = makeDb([[item()], [{ value: 1 }]]);
    const service = makeService(database);
    const result = await service.getByUser('user-1', { pageSize: 999 });
    expect(result.pageSize).toBe(50);
  });

  it('returns 404 when a user tries to mark a notification they do not own', async () => {
    const { database, returningRows } = makeDb([]);
    const service = makeService(database);
    await expect(service.markRead('notif-other', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(returningRows).toEqual([]);
  });

  it('marks all read only through the authenticated account scope', async () => {
    const { database, select, insert } = makeDb([]);
    const service = makeService(database);
    await expect(service.markAllRead('user-1')).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('shared admin view returns the operational projection without any read state', async () => {
    const { database } = makeDb([[item()], [{ value: 1 }]]);
    const service = makeService(database);
    const result = await service.getSharedAdminEvents({ page: 1, pageSize: 20 });
    const view = result.items[0];
    expect(view).toMatchObject({
      id: 'notif-1',
      notificationType: 'LIMIT_REQUEST_CREATED',
      title: 'title',
      message: 'message',
      notificationStatus: 'SENT',
      eventTime: item().createdAt,
      route: '/admin/students',
    });
    expect(view).not.toHaveProperty('readAt');
    expect(view).not.toHaveProperty('userId');
  });

  it('keeps the shared operational view bounded and stably ordered', async () => {
    const { database, select } = makeDb([[item()], [{ value: 1 }]]);
    const service = makeService(database);
    await service.getSharedAdminEvents({
      page: 2,
      pageSize: 10,
      type: 'LIMIT_REQUEST_CREATED',
      status: 'SENT',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-09',
    });
    const itemsQuery = select.mock.results[0].value;
    expect(itemsQuery.orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything());
    expect(itemsQuery.limit).toHaveBeenCalledWith(10);
    expect(itemsQuery.offset).toHaveBeenCalledWith(10);
  });

  it('counts only unread rows returned for the authenticated user', async () => {
    const { database } = makeDb([[item({ readAt: null })]]);
    const service = makeService(database);
    await expect(service.getUnreadCount('user-1')).resolves.toEqual({ unreadCount: 1 });
  });
});
