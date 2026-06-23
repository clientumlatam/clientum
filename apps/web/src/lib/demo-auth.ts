const DEMO_KEY = "clientum_demo_session";
const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

export const DEMO_CREDENTIALS = {
  email: "demo@clientum.com.ar",
  password: "demo1234",
};

export const demoAuth = {
  signIn(email: string, password: string): boolean {
    if (!isBrowser) return false;
    if (
      email === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    ) {
      localStorage.setItem(DEMO_KEY, JSON.stringify({ email, ts: Date.now() }));
      return true;
    }
    return false;
  },

  isActive(): boolean {
    if (!isBrowser) return false;
    return !!localStorage.getItem(DEMO_KEY);
  },

  signOut() {
    if (!isBrowser) return;
    localStorage.removeItem(DEMO_KEY);
  },

  getUser() {
    if (!isBrowser) return null;
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { email: string; ts: number };
    return {
      id: "demo-user-001",
      email: session.email,
      user_metadata: { display_name: "Demo User" },
    };
  },
};
