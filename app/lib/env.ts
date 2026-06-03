type RequiredServerEnv = {
  name: "DATABASE_URL" | "NEXTAUTH_SECRET";
  reason: string;
};

export type MissingServerEnv = RequiredServerEnv;

const REQUIRED_SERVER_ENV: RequiredServerEnv[] = [
  {
    name: "DATABASE_URL",
    reason: "Prisma needs a PostgreSQL connection string before server-rendered job pages can query jobs.",
  },
  {
    name: "NEXTAUTH_SECRET",
    reason: "Auth.js needs a stable secret before server-rendered pages can read sessions.",
  },
];

export class ServerSetupError extends Error {
  missingEnv: MissingServerEnv[];

  constructor(missingEnv: MissingServerEnv[]) {
    const names = missingEnv.map((envVar) => envVar.name).join(", ");
    super(`Questing local setup is incomplete. Missing required environment variable(s): ${names}.`);
    this.name = "ServerSetupError";
    this.missingEnv = missingEnv;
  }
}

type ServerEnv = Record<string, string | undefined>;

export function getMissingServerEnv(env: ServerEnv = process.env): MissingServerEnv[] {
  return REQUIRED_SERVER_ENV.filter(({ name }) => !env[name]?.trim());
}

export function assertServerEnv(env: ServerEnv = process.env): void {
  const missingEnv = getMissingServerEnv(env);
  if (missingEnv.length > 0) {
    throw new ServerSetupError(missingEnv);
  }
}

export function isServerSetupError(error: unknown): error is ServerSetupError {
  return error instanceof ServerSetupError;
}
