import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAccessChatThread,
  canWorkerCreatePrivateThread,
} from '../app/lib/chat-authorization.mjs';

test('private chat access is limited to poster and exact participant worker', () => {
  const thread = {
    threadType: 'PRIVATE',
    posterId: 'poster-1',
    privateWorkerId: 'worker-1',
  };

  assert.equal(canAccessChatThread(thread, 'poster-1'), true);
  assert.equal(canAccessChatThread(thread, 'worker-1'), true);
  assert.equal(canAccessChatThread(thread, 'worker-2'), false);
});

test('legacy private chats without a bound worker are not readable by accepted workers', () => {
  const thread = {
    threadType: 'PRIVATE',
    posterId: 'poster-1',
    privateWorkerId: null,
  };

  assert.equal(canAccessChatThread(thread, 'poster-1'), true);
  assert.equal(canAccessChatThread(thread, 'worker-1'), false);
});

test('private threads can only be created for accepted worker applications', () => {
  assert.equal(canWorkerCreatePrivateThread({ status: 'ACCEPTED' }), true);
  assert.equal(canWorkerCreatePrivateThread({ status: 'FCFS_ACCEPTED' }), true);
  assert.equal(canWorkerCreatePrivateThread({ status: 'PENDING' }), false);
  assert.equal(canWorkerCreatePrivateThread(null), false);
});
