export type TursoConfig = {
  url: string;
  authToken: string;
};

export function getTursoConfig(): TursoConfig {
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Missing database env: set TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN");
  }

  return { url, authToken };
}
