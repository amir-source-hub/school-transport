import { describe, expect, it } from "vitest";

import { getRegistrationTone } from "./mock-registrations";

describe("getRegistrationTone", () => {
  it("uses the documented semantic status colors consistently", () => {
    expect(getRegistrationTone("تأییدشده")).toBe("success");
    expect(getRegistrationTone("ردشده")).toBe("danger");
    expect(getRegistrationTone("نیازمند اصلاح")).toBe("warning");
    expect(getRegistrationTone("در حال بررسی")).toBe("warning");
  });
});
