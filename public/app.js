(async () => {
  const login = document.querySelector("#login");
  const logout = document.querySelector("#logout");
  const platform = document.querySelector("#platform");
  const status = document.querySelector("#status");
  const errorBox = document.querySelector("#error");
  const showError = (error) => {
    errorBox.textContent =
      error.message ?? "No se pudo iniciar sesión. Inténtalo de nuevo.";
    errorBox.hidden = false;
  };

  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok)
      throw new Error("No se pudo cargar la configuración del portal.");
    const config = await response.json();
    const callbackUrl = `${window.location.origin}/`;
    const client = new auth0.Auth0Client({
      domain: config.auth0Domain,
      clientId: config.auth0ClientId,
      cacheLocation: "memory",
      authorizationParams: {
        redirect_uri: callbackUrl,
        scope: "openid profile email",
        ...(config.organization ? { organization: config.organization } : {}),
      },
    });

    login.addEventListener("click", async () => {
      login.disabled = true;
      errorBox.hidden = true;
      try {
        await client.loginWithRedirect();
      } catch (error) {
        showError(error);
        login.disabled = false;
      }
    });
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      errorBox.hidden = true;
      try {
        await client.logout({ logoutParams: { returnTo: callbackUrl } });
      } catch (error) {
        showError(error);
        logout.disabled = false;
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("error") || params.has("state")) {
      try {
        await client.handleRedirectCallback();
      } catch (error) {
        showError(error);
      } finally {
        window.history.replaceState({}, "", "/");
      }
    }

    const authenticated = await client.isAuthenticated();
    status.textContent = authenticated
      ? "Sesión iniciada en el portal de demostración"
      : "Inicia sesión para continuar";
    login.hidden = authenticated;
    login.disabled = false;
    logout.hidden = !authenticated;
    platform.hidden = !authenticated;
    document.querySelector("#login-view").hidden = authenticated;
    document.querySelector("#dashboard").hidden = !authenticated;
    document.querySelector("main").classList.toggle("signed-in", authenticated);
    if (authenticated) {
      const user = await client.getUser();
      document.querySelector("#name").textContent = user?.name ?? "bienvenido";
      document.querySelector("#email").textContent = user?.email ?? "";
      platform.href = config.platformUrl;
    }
  } catch (error) {
    status.textContent = "Portal no disponible";
    showError(error);
  }
})();
