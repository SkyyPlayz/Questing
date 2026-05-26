type ChatThreadScope = {
  jobId: string;
  threadType: "PUBLIC_QA" | "PRIVATE";
  workerId?: string | null;
};

type ChatThreadFindFirstArgs<TInclude> = {
  where: Record<string, unknown>;
  orderBy: { createdAt: "asc" };
  include?: TInclude;
};

type ChatThreadCreateArgs<TInclude> = {
  data: {
    jobId: string;
    threadType: ChatThreadScope["threadType"];
    privateWorkerId?: string | null;
  };
  include?: TInclude;
};

type ChatThreadPrisma<TThread, TInclude> = {
  chatThread: {
    findFirst(args: ChatThreadFindFirstArgs<TInclude>): Promise<TThread | null>;
    create(args: ChatThreadCreateArgs<TInclude>): Promise<TThread>;
  };
};

export function isUniqueConstraintError(error: unknown): boolean;

export function findExistingChatThread<TThread, TInclude>(
  prisma: ChatThreadPrisma<TThread, TInclude>,
  scope: ChatThreadScope,
  include?: TInclude
): Promise<TThread | null>;

export function createChatThreadIdempotently<TThread, TInclude>(
  prisma: ChatThreadPrisma<TThread, TInclude>,
  scope: ChatThreadScope,
  include?: TInclude
): Promise<{ thread: TThread; created: boolean }>;
