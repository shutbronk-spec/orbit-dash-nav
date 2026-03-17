const SESSION_KEY = 'session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export interface Session {
  username: string;
  loginTime: number;
  expiresIn: number;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() - session.loginTime > session.expiresIn) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function createSession(username: string): void {
  const session: Session = {
    username,
    loginTime: Date.now(),
    expiresIn: SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
