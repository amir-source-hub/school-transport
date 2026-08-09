import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 5100);
const emptyCollections = new Set([
  '/api/v1/students',
  '/api/v1/enrollments',
  '/api/v1/contracts',
  '/api/v1/payments',
  '/api/v1/notifications',
  '/api/v1/admin/enrollments',
  '/api/v1/admin/contracts',
  '/api/v1/admin/payments',
]);

function send(response, status, data) {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Correlation-Id, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': response.req.headers.origin ?? '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(data));
}

const server = createServer((request, response) => {
  response.req = request;
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (request.method === 'OPTIONS') return send(response, 204, null);
  if (url.pathname === '/health') return send(response, 200, { ok: true });
  if (url.pathname === '/api/v1/auth/me') {
    if (request.headers.cookie?.includes('e2e-failure=503')) {
      return send(response, 200, {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'seeded dependency failure' },
      });
    }
    const role = request.headers.cookie?.includes('e2e-role=ADMIN') ? 'ADMIN' : 'PARENT';
    return send(response, 200, { success: true, data: { user: { role } } });
  }
  if (url.pathname === '/api/v1/notifications/settings') {
    return send(response, 200, {
      success: true,
      data: {
        textVersion: 'e2e-v1',
        consentText: 'متن رضایت آزمایشی',
        serviceNotices: { inApp: true, sms: true, configurable: false },
        optionalUpdates: { inApp: false, sms: false },
      },
    });
  }
  if (url.pathname === '/api/v1/notifications/unread-count') {
    return send(response, 200, { success: true, data: { count: 0 } });
  }
  if (url.pathname === '/api/v1/students/limit-requests') {
    return send(response, 200, { success: true, data: [] });
  }
  if (url.pathname === '/api/v1/schools' && request.headers.cookie?.includes('e2e-enrollment=1')) {
    return send(response, 200, {
      success: true,
      data: [
        {
          id: 'school-1',
          name: 'مدرسه آزمایشی',
          schoolType: 'PUBLIC',
          genderType: 'GIRLS',
          province: 'تهران',
          city: 'تهران',
          district: null,
          address: 'نشانی مدرسه',
          phoneNumber: null,
          educationOptions: [{ level: 'ابتدایی', grades: ['پنجم'] }],
        },
      ],
    });
  }
  if (
    url.pathname === '/api/v1/families/me' &&
    request.headers.cookie?.includes('e2e-enrollment=1')
  ) {
    return send(response, 200, {
      success: true,
      data: {
        id: 'family-1',
        username: 'family',
        mother: null,
        father: null,
        addresses: [],
        emergencyContacts: [],
      },
    });
  }
  if (
    url.pathname === '/api/v1/students/capacity' &&
    request.headers.cookie?.includes('e2e-enrollment=1')
  ) {
    return send(response, 200, {
      success: true,
      data: { studentLimit: 2, activeStudentCount: 0, remaining: 2 },
    });
  }
  if (
    url.pathname === '/api/v1/admin/admins' &&
    request.headers.cookie?.includes('e2e-admin-data=1')
  ) {
    return send(response, 200, {
      success: true,
      data: [
        {
          id: '00000000-0000-4000-8000-000000000201',
          username: 'administrator-with-a-very-long-username',
          firstName: 'مدیر',
          lastName: 'آزمایشی',
          phoneNumber: '09120000000',
          email: null,
          status: 'ACTIVE',
          lastLoginAt: '2026-08-09T10:00:00.000Z',
        },
      ],
    });
  }
  if (
    url.pathname === '/api/v1/admin/admins/me' &&
    request.headers.cookie?.includes('e2e-admin-data=1')
  ) {
    return send(response, 200, {
      success: true,
      data: {
        id: '00000000-0000-4000-8000-000000000201',
        username: 'administrator-with-a-very-long-username',
        firstName: 'مدیر',
        lastName: 'آزمایشی',
        phoneNumber: '09120000000',
        email: null,
        status: 'ACTIVE',
        lastLoginAt: '2026-08-09T10:00:00.000Z',
      },
    });
  }
  if (
    url.pathname === '/api/v1/admin/enrollments' &&
    request.headers.cookie?.includes('e2e-admin-data=1')
  ) {
    return send(response, 200, {
      success: true,
      data: [
        {
          id: '00000000-0000-4000-8000-000000000301',
          studentId: 'student-1',
          studentName: 'دانش‌آموز با نام طولانی آزمایشی',
          familyName: 'خانواده آزمایشی',
          familyId: 'family-1',
          schoolId: 'school-1',
          schoolName: 'مدرسه آزمایشی',
          registrationStatus: 'SUBMITTED',
          paidInstallmentCount: 0,
          installmentCount: 0,
          createdAt: '2026-08-09T10:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 500, totalItems: 1, totalPages: 1 },
    });
  }
  if (
    /^\/api\/v1\/admin\/enrollments\/[^/]+\/pricing$/.test(url.pathname) &&
    request.headers.cookie?.includes('e2e-admin-data=1')
  ) {
    return send(response, 200, { success: true, data: [] });
  }
  if (
    url.pathname === '/api/v1/notifications' &&
    request.headers.cookie?.includes('e2e-notifications=1')
  ) {
    return send(response, 200, {
      success: true,
      data: [
        {
          id: '00000000-0000-4000-8000-000000000101',
          eventId: 'e2e-event',
          notificationType: 'ENROLLMENT_APPROVED',
          channel: 'IN_APP',
          purpose: 'SERVICE_NOTICE',
          title: 'ثبت‌نام تأیید شد',
          message:
            'پیام آزمایشی <img src=x onerror="window.__e2eXss=true"> <script>window.__e2eXss=true</script>',
          relatedEntityType: 'REGISTRATION',
          relatedEntityId: null,
          notificationStatus: 'SENT',
          readAt: null,
          sentAt: '2026-08-09T10:00:00.000Z',
          createdAt: '2026-08-09T10:00:00.000Z',
          updatedAt: '2026-08-09T10:00:00.000Z',
          route: '/student/dashboard',
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      meta: { snapshotAt: '2026-08-09T12:00:00.000Z' },
    });
  }
  if (url.pathname === '/api/v1/payments' && request.headers.cookie?.includes('e2e-payments=1')) {
    return send(response, 200, {
      success: true,
      data: [
        {
          plan: {
            id: 'plan-1',
            totalAmount: 1000,
            prepaymentAmount: 1000,
            remainingInstallmentAmount: 0,
            installmentCount: 1,
            planStatus: 'PENDING',
            planType: 'FULL',
          },
          studentId: 'student-1',
          studentFirstName: 'سارا',
          studentLastName: 'احمدی',
          items: [
            {
              id: 'item-1',
              itemType: 'PREPAYMENT',
              sequenceNumber: 0,
              amount: 1000,
              dueDate: null,
              itemStatus: 'PENDING',
              paidAmount: 0,
            },
          ],
          transactions: [],
        },
      ],
    });
  }
  if (url.pathname === '/api/v1/payments/offline-submissions' && request.method === 'GET') {
    return send(response, 200, { success: true, data: [] });
  }
  if (url.pathname === '/api/v1/payments/offline-destination') {
    return send(response, 200, {
      success: true,
      data: {
        id: 'destination-1',
        version: 1,
        accountOwner: 'ثمین گشت',
        bankName: 'بانک آزمایشی',
        cardNumber: '1234567890123456',
        iban: null,
        accountNumber: null,
        instructions: 'فقط برای آزمون مرورگر',
      },
    });
  }
  if (url.pathname === '/api/v1/payments/item-1/offline-submissions' && request.method === 'POST') {
    return send(response, 200, { success: true, data: { submissionId: 'submission-1' } });
  }
  if (url.pathname === '/api/v1/payments/offline-submissions/submission-1/receipt/authorize') {
    const failure = request.headers.cookie?.includes('e2e-receipt-failure=1');
    return send(response, 200, {
      success: true,
      data: { uploadUrl: `http://127.0.0.1:${port}/uploads/${failure ? 'failure' : 'receipt'}` },
    });
  }
  if (url.pathname.startsWith('/uploads/') && request.method === 'PUT') {
    return send(response, url.pathname.endsWith('/failure') ? 503 : 200, { ok: true });
  }
  if (url.pathname === '/api/v1/payments/offline-submissions/submission-1/receipt/complete') {
    return send(response, 200, { success: true, data: { completed: true } });
  }
  if (
    url.pathname === '/api/v1/students/student-photo-1' &&
    request.headers.cookie?.includes('e2e-photo=1')
  ) {
    return send(response, 200, {
      success: true,
      data: {
        id: 'student-photo-1',
        userId: 'parent-1',
        schoolId: 'school-1',
        schoolName: 'مدرسه آزمایشی',
        firstName: 'سارا',
        lastName: 'احمدی',
        nationalId: '0012345678',
        birthDate: null,
        gender: 'FEMALE',
        grade: '5',
        className: null,
        isActive: true,
      },
    });
  }
  if (
    url.pathname === '/api/v1/student-photos/current' &&
    request.headers.cookie?.includes('e2e-photo=1')
  ) {
    return send(response, 200, { success: true, data: { items: [] } });
  }
  if (
    url.pathname === '/api/v1/student-photos/uploads' &&
    request.method === 'POST' &&
    request.headers.cookie?.includes('e2e-photo=1')
  ) {
    return send(response, 200, {
      success: true,
      data: {
        uploadId: 'photo-upload-1',
        objectKey: 'student-photos/raw/photo-upload-1.png',
        uploadUrl: `http://127.0.0.1:${port}/uploads/photo`,
        expiresInSeconds: 300,
        acceptedFormats: ['image/jpeg', 'image/png'],
        maxBytes: 26214400,
        status: 'AUTHORIZED',
      },
    });
  }
  if (url.pathname === '/api/v1/student-photos/uploads/photo-upload-1/complete') {
    return send(response, 200, {
      success: true,
      data: {
        uploadId: 'photo-upload-1',
        studentId: 'student-photo-1',
        status: 'PENDING_REVIEW',
        rejectionCode: null,
        createdAt: '2026-08-09T10:00:00.000Z',
        updatedAt: '2026-08-09T10:00:01.000Z',
      },
    });
  }
  if (emptyCollections.has(url.pathname)) {
    return send(response, 200, { success: true, data: [] });
  }
  return send(response, 404, {
    success: false,
    error: { code: 'E2E_FIXTURE_MISSING', message: `No E2E fixture for ${url.pathname}` },
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`E2E mock API listening on ${port}\n`);
});
