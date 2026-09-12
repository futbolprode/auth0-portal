import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { JSDOM } from "jsdom";
import { readConfig } from "../config.mjs";
import { createPortalServer } from "../server.mjs";

const env = {
  AUTH0_DOMAIN: "test.us.auth0.com",
  AUTH0_CLIENT_ID: "portal-client",
  PLATFORM_URL: "https://game.example/company/app/news?round=2#latest",
};
const config = readConfig(env);

describe("runtime configuration", () => {
  it("preserves the full destination and only exposes public settings", () => {
    assert.deepEqual(
      readConfig({ ...env, AUTH0_CLIENT_SECRET: "never-export" }),
      {
        auth0Domain: env.AUTH0_DOMAIN,
        auth0ClientId: env.AUTH0_CLIENT_ID,
        platformUrl: env.PLATFORM_URL,
      }
    );
  });
  it("accepts HTTPS issuer format, local destination and organization", () => {
    const result = readConfig({
      ...env,
      AUTH0_DOMAIN: "https://login.example.com/",
      PLATFORM_URL: "http://localhost:5000/test/app/",
      AUTH0_ORGANIZATION: " org_test ",
    });
    assert.equal(result.auth0Domain, "login.example.com");
    assert.equal(result.organization, "org_test");
  });
  for (const key of Object.keys(env)) {
    it(`requires ${key}`, () => {
      assert.throws(() => readConfig({ ...env, [key]: "" }), /Missing/);
    });
  }
  for (const destination of [
    "javascript:alert(1)",
    "http://public.example/",
    "https://user:password@example.com/",
  ]) {
    it(`rejects unsafe destination ${destination}`, () => {
      assert.throws(
        () => readConfig({ ...env, PLATFORM_URL: destination }),
        /PLATFORM_URL/
      );
    });
  }
  it("rejects an issuer containing credentials or an HTTP scheme", () => {
    for (const domain of [
      "https://user:password@example.com/",
      "http://tenant.example/",
      "https://tenant.example/path",
    ]) {
      assert.throws(
        () => readConfig({ ...env, AUTH0_DOMAIN: domain }),
        /AUTH0_DOMAIN/
      );
    }
  });
});

describe("HTTP server", () => {
  let server;
  let origin;
  before(async () => {
    server = createPortalServer(config);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  it("serves runtime destination without caching", async () => {
    const response = await fetch(`${origin}/config.json`);
    assert.deepEqual(await response.json(), config);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
  it("serves the root callback, stylesheet, UI script and installed Auth0 SDK", async () => {
    for (const path of [
      "/?code=example&state=example",
      "/styles.css",
      "/app.js",
      "/auth0.js",
    ]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200, path);
      assert.ok((await response.text()).length > 0);
    }
  });
  it("does not serve environment files or arbitrary local paths", async () => {
    for (const path of [
      "/.env",
      "/package.json",
      "/server.mjs",
      "/%2e%2e/.env",
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 404);
    }
  });
  it("rejects writes", async () => {
    assert.equal((await fetch(`${origin}/`, { method: "POST" })).status, 405);
  });
});

const html = await readFile(
  new URL("../public/index.html", import.meta.url),
  "utf8"
);
const script = await readFile(
  new URL("../public/app.js", import.meta.url),
  "utf8"
);

async function portal({
  authenticated = false,
  error,
  url = "https://portal.example/",
  configError = false,
  user = { name: "<img src=x onerror=alert(1)>", email: "test@example.com" },
} = {}) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  const calls = [];
  dom.window.fetch = async () => ({
    ok: !configError,
    json: async () => config,
  });
  dom.window.auth0 = {
    Auth0Client: class {
      constructor(options) {
        calls.push(["create", options]);
      }
      async loginWithRedirect() {
        calls.push(["login"]);
      }
      async logout(options) {
        calls.push(["logout", options]);
      }
      async handleRedirectCallback() {
        calls.push(["callback"]);
        if (error) throw new Error(error);
      }
      async isAuthenticated() {
        return authenticated;
      }
      async getUser() {
        return user;
      }
    },
  };
  await dom.window.eval(script);
  return {
    dom,
    calls,
    element: (id) => dom.window.document.getElementById(id),
  };
}

describe("portal login flow", () => {
  it("displays the collected profile and hides failed images", async () => {
    const { dom, element } = await portal({ authenticated: true, user: {
      name: "test@example.com",
      "https://auth0-portal.vercel.app/profile": {name: "Ana Pérez", picture: "https://images.example/ana.jpg"},
    }});
    try {
      assert.equal(element("name").textContent, "Ana Pérez");
      assert.equal(element("avatar").hidden, false);
      element("avatar").dispatchEvent(new dom.window.Event("error"));
      assert.equal(element("avatar").hidden, true);
    } finally { dom.window.close(); }
  });
  it("rejects unsafe profile images", async () => {
    const { dom, element } = await portal({ authenticated: true, user: {
      picture: "javascript:alert(1)",
    }});
    try { assert.equal(element("avatar").hasAttribute("src"), false); }
    finally { dom.window.close(); }
  });
  it("requires portal login before showing the platform link", async () => {
    const { dom, calls, element } = await portal();
    try {
      assert.equal(element("platform").hidden, true);
      assert.equal(element("dashboard").hidden, true);
      assert.equal(element("login").disabled, false);
      element("login").click();
      assert.ok(calls.some(([name]) => name === "login"));
      assert.equal(
        calls[0][1].authorizationParams.redirect_uri,
        "https://portal.example/"
      );
      assert.equal(calls[0][1].authorizationParams.ui_locales, undefined);
    } finally {
      dom.window.close();
    }
  });
  it("validates callback through SDK, cleans URL and preserves full destination", async () => {
    const { dom, calls, element } = await portal({
      authenticated: true,
      url: "https://portal.example/?code=test&state=test",
    });
    try {
      assert.ok(calls.some(([name]) => name === "callback"));
      assert.equal(dom.window.location.search, "");
      assert.equal(element("platform").href, env.PLATFORM_URL);
      assert.equal(element("platform").hidden, false);
      assert.equal(element("dashboard").hidden, false);
      assert.equal(element("login-view").hidden, true);
      assert.equal(element("dashboard").querySelectorAll("article").length, 3);
      assert.match(
        element("dashboard").textContent,
        /Contenido de demostración/
      );
      assert.equal(element("name").querySelector("img"), null);
      assert.equal(element("name").textContent, "<img src=x onerror=alert(1)>");
    } finally {
      dom.window.close();
    }
  });
  it("shows failed callback safely and permits manual retry", async () => {
    const { dom, element } = await portal({
      error: "Invalid state",
      url: "https://portal.example/?error=access_denied&state=test",
    });
    try {
      assert.equal(element("error").textContent, "Invalid state");
      assert.equal(element("error").hidden, false);
      assert.equal(element("login").disabled, false);
      assert.equal(element("platform").hidden, true);
      assert.equal(element("dashboard").hidden, true);
      assert.equal(dom.window.location.search, "");
    } finally {
      dom.window.close();
    }
  });
  it("uses the portal URL when signing out of Auth0", async () => {
    const { dom, calls, element } = await portal({ authenticated: true });
    try {
      element("logout").click();
      assert.equal(calls.at(-1)[0], "logout");
      assert.equal(
        calls.at(-1)[1].logoutParams.returnTo,
        "https://portal.example/"
      );
    } finally {
      dom.window.close();
    }
  });
  it("keeps actions unavailable if runtime configuration fails", async () => {
    const { dom, element } = await portal({ configError: true });
    try {
      assert.equal(element("status").textContent, "Portal no disponible");
      assert.equal(element("platform").hidden, true);
      assert.equal(element("dashboard").hidden, true);
      assert.equal(element("login").disabled, true);
    } finally {
      dom.window.close();
    }
  });
});
