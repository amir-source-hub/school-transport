import { describe, expect, it } from "vitest";

import { getFinanceStatusTone } from "./status";

describe("getFinanceStatusTone", () => {
  it("maps documented financial statuses to consistent feedback tones", () => {
    expect(getFinanceStatusTone("پرداخت‌شده")).toBe("success");
    expect(getFinanceStatusTone("فعال")).toBe("success");
    expect(getFinanceStatusTone("سررسید گذشته")).toBe("danger");
    expect(getFinanceStatusTone("لغوشده")).toBe("neutral");
    expect(getFinanceStatusTone("صادرشده")).toBe("warning");
  });
});
