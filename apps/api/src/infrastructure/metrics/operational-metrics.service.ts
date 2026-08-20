import { Injectable } from '@nestjs/common';

export type MessageCategory =
  | 'otp'
  | 'service_notification'
  | 'optional_notification'
  | 'test_broadcast'
  | 'broadcast_campaign';

export type MessageOutcome =
  | 'accepted'
  | 'rejected'
  | 'timeout'
  | 'transient_failure'
  | 'permanent_failure'
  | 'skipped_no_consent'
  | 'skipped_no_phone'
  | 'disabled'
  | 'retry'
  | 'dead_letter'
  | 'rate_limited';

const LATENCY_BUCKETS = [0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;
const HTTP_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] as const;

@Injectable()
export class OperationalMetricsService {
  private readonly outcomes = new Map<string, number>();
  private readonly latencyCounts = new Map<string, number[]>();
  private readonly latencySums = new Map<string, number>();
  private readonly latencyObservations = new Map<string, number>();
  private queueAgeSeconds = 0;
  private broadcastEstimatedSpendRial = 0;
  private readonly stalePhotoRows = new Map<string, number>();
  private readonly httpCounts = new Map<string, number>();
  private readonly httpLatency = new Map<string, number[]>();
  private readonly queueOutcomes = new Map<string, number>();
  private readonly databaseOutcomes = new Map<string, number>();
  private readonly studentPhotoStale = new Map<string, number>();
  private readonly studentPhotoCleanupOutcomes = new Map<string, number>();
  private databasePool?: () => { total: number; idle: number; waiting: number };

  recordHttp(method: string, route: string, status: number, seconds: number) {
    const statusClass = `${Math.floor(status / 100)}xx`;
    const key = `${method}\t${route}\t${statusClass}`;
    this.httpCounts.set(key, (this.httpCounts.get(key) ?? 0) + 1);
    const buckets = this.httpLatency.get(key) ?? HTTP_BUCKETS.map(() => 0);
    HTTP_BUCKETS.forEach((bucket, index) => {
      if (seconds <= bucket) buckets[index] += 1;
    });
    this.httpLatency.set(key, buckets);
  }

  recordQueue(queue: string, outcome: 'enqueued' | 'completed' | 'failed') {
    const key = `${queue}:${outcome}`;
    this.queueOutcomes.set(key, (this.queueOutcomes.get(key) ?? 0) + 1);
  }

  recordDatabase(outcome: 'ready' | 'unavailable') {
    this.databaseOutcomes.set(outcome, (this.databaseOutcomes.get(outcome) ?? 0) + 1);
  }

  recordStudentPhotoCleanup(outcome: 'completed' | 'failed') {
    this.studentPhotoCleanupOutcomes.set(
      outcome,
      (this.studentPhotoCleanupOutcomes.get(outcome) ?? 0) + 1,
    );
  }

  setStudentPhotoStaleCounts(counts: Record<'AUTHORIZED' | 'UPLOADED' | 'VALIDATING', number>) {
    for (const [status, value] of Object.entries(counts))
      this.studentPhotoStale.set(status, Math.max(0, value));
  }

  registerDatabasePool(snapshot: () => { total: number; idle: number; waiting: number }) {
    this.databasePool = snapshot;
  }

  recordMessage(category: MessageCategory, outcome: MessageOutcome, latencySeconds?: number) {
    const key = `${category}:${outcome}`;
    this.outcomes.set(key, (this.outcomes.get(key) ?? 0) + 1);
    if (latencySeconds === undefined) return;
    const counts = this.latencyCounts.get(category) ?? LATENCY_BUCKETS.map(() => 0);
    LATENCY_BUCKETS.forEach((bucket, index) => {
      if (latencySeconds <= bucket) counts[index] += 1;
    });
    this.latencyCounts.set(category, counts);
    this.latencySums.set(category, (this.latencySums.get(category) ?? 0) + latencySeconds);
    this.latencyObservations.set(category, (this.latencyObservations.get(category) ?? 0) + 1);
  }

  setNotificationQueueAge(seconds: number) {
    this.queueAgeSeconds = Math.max(0, seconds);
  }

  addBroadcastEstimatedSpend(rial: number) {
    this.broadcastEstimatedSpendRial += Math.max(0, rial);
  }

  recordStaleStudentPhotoRows(rows: { status: string; count: number }[]) {
    for (const row of rows) this.stalePhotoRows.set(row.status, Math.max(0, row.count));
  }

  renderPrometheus(): string {
    const lines = [
      '# HELP school_transport_message_outcomes_total Bounded SMS and OTP outcomes.',
      '# TYPE school_transport_message_outcomes_total counter',
    ];
    for (const [key, value] of [...this.outcomes].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [category, outcome] = key.split(':');
      lines.push(
        `school_transport_message_outcomes_total{category="${category}",outcome="${outcome}"} ${value}`,
      );
    }
    lines.push(
      '# HELP school_transport_message_provider_latency_seconds Provider request latency.',
      '# TYPE school_transport_message_provider_latency_seconds histogram',
    );
    for (const [category, counts] of [...this.latencyCounts].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      LATENCY_BUCKETS.forEach((bucket, index) =>
        lines.push(
          `school_transport_message_provider_latency_seconds_bucket{category="${category}",le="${bucket}"} ${counts[index]}`,
        ),
      );
      const count = this.latencyObservations.get(category) ?? 0;
      lines.push(
        `school_transport_message_provider_latency_seconds_bucket{category="${category}",le="+Inf"} ${count}`,
        `school_transport_message_provider_latency_seconds_sum{category="${category}"} ${this.latencySums.get(category) ?? 0}`,
        `school_transport_message_provider_latency_seconds_count{category="${category}"} ${count}`,
      );
    }
    lines.push(
      '# HELP school_transport_notification_queue_oldest_age_seconds Age of the oldest dispatchable notification.',
      '# TYPE school_transport_notification_queue_oldest_age_seconds gauge',
      `school_transport_notification_queue_oldest_age_seconds ${this.queueAgeSeconds}`,
      '# HELP school_transport_broadcast_estimated_spend_rial_total Approved estimated broadcast spend.',
      '# TYPE school_transport_broadcast_estimated_spend_rial_total counter',
      `school_transport_broadcast_estimated_spend_rial_total ${this.broadcastEstimatedSpendRial}`,
    );
    lines.push(
      '# HELP school_transport_http_requests_total HTTP requests by normalized route and status class.',
      '# TYPE school_transport_http_requests_total counter',
      '# HELP school_transport_http_duration_seconds HTTP request duration by normalized route and status class.',
      '# TYPE school_transport_http_duration_seconds histogram',
    );
    for (const [key, count] of [...this.httpCounts].sort()) {
      const [method, route, statusClass] = key.split('\t');
      lines.push(
        `school_transport_http_requests_total{method="${method}",route="${route}",status_class="${statusClass}"} ${count}`,
      );
      const buckets = this.httpLatency.get(key) ?? [];
      HTTP_BUCKETS.forEach((bucket, index) =>
        lines.push(
          `school_transport_http_duration_seconds_bucket{method="${method}",route="${route}",status_class="${statusClass}",le="${bucket}"} ${buckets[index] ?? 0}`,
        ),
      );
      lines.push(
        `school_transport_http_duration_seconds_bucket{method="${method}",route="${route}",status_class="${statusClass}",le="+Inf"} ${count}`,
      );
      lines.push(
        `school_transport_http_duration_seconds_count{method="${method}",route="${route}",status_class="${statusClass}"} ${count}`,
      );
    }
    lines.push(
      '# HELP school_transport_queue_jobs_total Queue lifecycle outcomes.',
      '# TYPE school_transport_queue_jobs_total counter',
    );
    for (const [key, count] of [...this.queueOutcomes].sort()) {
      const [queue, outcome] = key.split(':');
      lines.push(
        `school_transport_queue_jobs_total{queue="${queue}",outcome="${outcome}"} ${count}`,
      );
    }
    lines.push(
      '# HELP school_transport_database_readiness_total Database readiness outcomes.',
      '# TYPE school_transport_database_readiness_total counter',
    );
    for (const [outcome, count] of [...this.databaseOutcomes].sort())
      lines.push(`school_transport_database_readiness_total{outcome="${outcome}"} ${count}`);
    lines.push(
      '# HELP school_transport_student_photo_stale_rows Stale student-photo workflow rows requiring cleanup attention.',
      '# TYPE school_transport_student_photo_stale_rows gauge',
    );
    for (const [status, value] of [...this.studentPhotoStale].sort())
      lines.push(`school_transport_student_photo_stale_rows{status="${status}"} ${value}`);
    lines.push(
      '# HELP school_transport_student_photo_cleanup_total Student-photo cleanup job outcomes.',
      '# TYPE school_transport_student_photo_cleanup_total counter',
    );
    for (const [outcome, value] of [...this.studentPhotoCleanupOutcomes].sort())
      lines.push(`school_transport_student_photo_cleanup_total{outcome="${outcome}"} ${value}`);
    const pool = this.databasePool?.();
    if (pool)
      lines.push(
        '# HELP school_transport_database_pool_connections PostgreSQL pool connections.',
        '# TYPE school_transport_database_pool_connections gauge',
        `school_transport_database_pool_connections{state="total"} ${pool.total}`,
        `school_transport_database_pool_connections{state="idle"} ${pool.idle}`,
        `school_transport_database_pool_connections{state="waiting"} ${pool.waiting}`,
      );
    lines.push(
      '# HELP school_transport_student_photo_stale_rows Stale student-photo uploads awaiting cleanup by status.',
      '# TYPE school_transport_student_photo_stale_rows gauge',
    );
    for (const status of ['AUTHORIZED', 'UPLOADED', 'VALIDATING']) {
      lines.push(
        `school_transport_student_photo_stale_rows{status="${status}"} ${this.stalePhotoRows.get(status) ?? 0}`,
      );
    }
    return `${lines.join('\n')}\n`;
  }
}
