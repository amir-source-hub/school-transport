import { describe, expect, it } from 'vitest';
import { OFFLINE_CONTRACT_TEMPLATE_HASH } from '../../common/offline-contract-template';
import { assertContractAcceptanceProof } from './contracts.service';

describe('contract acceptance proof', () => {
  it('requires all three reviewed pages and the exact immutable template hash', () => {
    const snapshot = { templateHash: OFFLINE_CONTRACT_TEMPLATE_HASH };
    expect(() =>
      assertContractAcceptanceProof(snapshot, {
        templateHash: OFFLINE_CONTRACT_TEMPLATE_HASH,
        reviewedPages: [1, 2],
      }),
    ).toThrow('هر سه صفحه');
    expect(() =>
      assertContractAcceptanceProof(snapshot, { templateHash: 'stale', reviewedPages: [1, 2, 3] }),
    ).toThrow('همین نسخه');
    expect(() =>
      assertContractAcceptanceProof(snapshot, {
        templateHash: OFFLINE_CONTRACT_TEMPLATE_HASH,
        reviewedPages: [3, 2, 1],
      }),
    ).toThrow('به ترتیب');
    expect(() =>
      assertContractAcceptanceProof(snapshot, {
        templateHash: OFFLINE_CONTRACT_TEMPLATE_HASH,
        reviewedPages: [1, 2, 3],
      }),
    ).not.toThrow();
  });
});
