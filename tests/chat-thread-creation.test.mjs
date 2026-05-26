import assert from 'node:assert/strict';
import test from 'node:test';

import { createChatThreadIdempotently } from '../app/lib/chat-thread-creation.mjs';

test('private chat creation reuses an existing empty thread for the same job and worker', async () => {
  const existingThread = {
    id: 'thread-1',
    jobId: 'job-1',
    threadType: 'PRIVATE',
    privateWorkerId: 'worker-1',
    messages: [],
  };
  let createCalls = 0;
  const prisma = {
    chatThread: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, {
          jobId: 'job-1',
          threadType: 'PRIVATE',
          privateWorkerId: 'worker-1',
        });
        return existingThread;
      },
      create: async () => {
        createCalls += 1;
        throw new Error('create should not be called');
      },
    },
  };

  const result = await createChatThreadIdempotently(prisma, {
    jobId: 'job-1',
    threadType: 'PRIVATE',
    workerId: 'worker-1',
  });

  assert.equal(result.created, false);
  assert.equal(result.thread, existingThread);
  assert.equal(createCalls, 0);
});

test('private chat creation recovers from a concurrent unique-constraint race', async () => {
  const existingThread = {
    id: 'thread-2',
    jobId: 'job-1',
    threadType: 'PRIVATE',
    privateWorkerId: 'worker-1',
    messages: [],
  };
  let findCalls = 0;
  const prisma = {
    chatThread: {
      findFirst: async () => {
        findCalls += 1;
        return findCalls === 1 ? null : existingThread;
      },
      create: async () => {
        const error = new Error('Unique constraint failed');
        error.code = 'P2002';
        throw error;
      },
    },
  };

  const result = await createChatThreadIdempotently(prisma, {
    jobId: 'job-1',
    threadType: 'PRIVATE',
    workerId: 'worker-1',
  });

  assert.equal(result.created, false);
  assert.equal(result.thread, existingThread);
  assert.equal(findCalls, 2);
});
