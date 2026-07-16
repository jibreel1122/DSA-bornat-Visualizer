import { describe, expect, it } from "vitest";
import { clientIp, readJson, requireSameOrigin } from "@/lib/server/request";

describe("request guards", () => {
  it("rejects cross-origin browser mutations", () => {
    const response = requireSameOrigin(new Request("https://app.example.test/api/account", { headers: { origin: "https://attacker.example" } }));
    expect(response?.status).toBe(403);
  });

  it("accepts same-origin requests and bounds JSON", async () => {
    const request = new Request("https://app.example.test/api/account", { method: "PUT", headers: { origin: "https://app.example.test", "content-type": "application/json" }, body: JSON.stringify({ ok: true }) });
    expect(requireSameOrigin(request)).toBeNull();
    expect(await readJson<{ ok: boolean }>(request)).toEqual({ ok: true });
  });

  it("accepts HTTPS browser requests forwarded to an internal HTTP server", () => {
    const request = new Request("http://127.0.0.1:3004/api/account", { headers: { origin: "https://app.example.test", host: "app.example.test", "x-forwarded-proto": "https" } });
    expect(requireSameOrigin(request)).toBeNull();
  });

  it("uses the first proxy address for rate-limit keys", () => {
    expect(clientIp(new Request("https://app.example.test", { headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.2" } }))).toBe("198.51.100.7");
  });
});
