export function readConfig(env = process.env) {
  const required = (key) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`Missing ${key}. See .env.example.`);
    return value;
  };

  const domain = required("AUTH0_DOMAIN");
  const issuer = new URL(domain.includes("://") ? domain : `https://${domain}`);
  if (
    issuer.protocol !== "https:" ||
    issuer.pathname !== "/" ||
    issuer.search ||
    issuer.hash ||
    issuer.username ||
    issuer.password
  ) {
    throw new Error("AUTH0_DOMAIN must be an HTTPS Auth0 hostname.");
  }

  const platform = new URL(required("PLATFORM_URL"));
  const localHttp =
    platform.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(platform.hostname);
  if (
    (platform.protocol !== "https:" && !localHttp) ||
    platform.username ||
    platform.password
  ) {
    throw new Error("PLATFORM_URL must use HTTPS, or HTTP on localhost.");
  }

  return {
    auth0Domain: issuer.host,
    auth0ClientId: required("AUTH0_CLIENT_ID"),
    platformUrl: platform.href,
    ...(env.AUTH0_ORGANIZATION?.trim()
      ? { organization: env.AUTH0_ORGANIZATION.trim() }
      : {}),
  };
}
