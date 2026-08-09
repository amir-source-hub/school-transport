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

@Injectable()
export class OperationalMetricsService {
  private readonly outcomes = new Map<string, number>();
  private readonly latencyCounts = new Map<string, number[]>();
  private readonly latencySums = new Map<string, number>();
  private readonly latencyObservations = new Map<string, number>();
  private queueAgeSeconds = 0;
  private broadcastEstimatedSpendRial = 0;

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
    return `${lines.join('\n')}\n`;
  }
}
