import { describe, expect, it } from 'vitest';
import { OperationalMetricsService } from './operational-metrics.service';

describe('OperationalMetricsService', () => {
  it('exports bounded message labels, latency, and queue age without sensitive values', () => {
    const metrics = new OperationalMetricsService();
    metrics.recordMessage('otp', 'accepted', 0.2);
    metrics.recordMessage('optional_notification', 'skipped_no_consent');
    metrics.recordMessage('service_notification', 'dead_letter');
    metrics.setNotificationQueueAge(42);
    metrics.addBroadcastEstimatedSpend(12_000);
    metrics.recordHttp('GET', '/api/v1/health', 200, 0.02);
    metrics.recordQueue('maintenance', 'completed');
    metrics.recordDatabase('ready');
    metrics.registerDatabasePool(() => ({ total: 4, idle: 3, waiting: 0 }));
    metrics.recordStaleStudentPhotoRows([
      { status: 'AUTHORIZED', count: 2 },
      { status: 'VALIDATING', count: 1 },
    ]);

    const output = metrics.renderPrometheus();
    expect(output).toContain(
      'school_transport_message_outcomes_total{category="otp",outcome="accepted"} 1',
    );
    expect(output).toContain(
      'school_transport_http_requests_total{method="GET",route="/api/v1/health",status_class="2xx"} 1',
    );
    expect(output).toContain(
      'school_transport_queue_jobs_total{queue="maintenance",outcome="completed"} 1',
    );
    expect(output).toContain('school_transport_database_pool_connections{state="idle"} 3');
    expect(output).toContain(
      'school_transport_message_outcomes_total{category="optional_notification",outcome="skipped_no_consent"} 1',
    );
    expect(output).toContain(
      'school_transport_message_provider_latency_seconds_count{category="otp"} 1',
    );
    expect(output).toContain('school_transport_notification_queue_oldest_age_seconds 42');
    expect(output).toContain('school_transport_broadcast_estimated_spend_rial_total 12000');
    expect(output).toContain(
      'school_transport_student_photo_stale_rows{status="AUTHORIZED"} 2',
    );
    expect(output).toContain('school_transport_student_photo_stale_rows{status="UPLOADED"} 0');
    expect(output).toContain('school_transport_student_photo_stale_rows{status="VALIDATING"} 1');
    expect(output).not.toMatch(/phone|user|message_body|api_key|token=/i);
  });

  it('clamps negative queue ages and never accepts arbitrary metric labels', () => {
    const metrics = new OperationalMetricsService();
    metrics.setNotificationQueueAge(-10);
    expect(metrics.renderPrometheus()).toContain(
      'school_transport_notification_queue_oldest_age_seconds 0',
    );
  });
});
