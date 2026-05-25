type ChatThreadScope = {
  jobId: string;
  threadType: "PUBLIC_QA" | "PRIVATE";
  workerId?: string | null;
};

export function isUniqueConstraintError(error: unknown): boolean;

export function findExistingChatThread<TPrisma, TInclude>(
  prisma: TPrisma,
  scope: ChatThreadScope,
  include?: TInclude
): Promise<any>;

export function createChatThreadIdempotently<TPrisma, TInclude>(
  prisma: TPrisma,
  scope: ChatThreadScope,
  include?: TInclude
): Promise<{ thread: any; created: boolean }>;
