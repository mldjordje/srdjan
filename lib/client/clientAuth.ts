const CLIENT_AUTH_EVENT = "srdjan:client-auth";

type ClientAuthDetail = {
  loggedIn?: boolean;
};

export const dispatchClientAuthChange = (loggedIn: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ClientAuthDetail>(CLIENT_AUTH_EVENT, {
      detail: { loggedIn },
    })
  );
};

export const subscribeClientAuthChange = (callback: (loggedIn: boolean) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ClientAuthDetail>).detail;
    callback(Boolean(detail?.loggedIn));
  };

  window.addEventListener(CLIENT_AUTH_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(CLIENT_AUTH_EVENT, handler as EventListener);
  };
};
