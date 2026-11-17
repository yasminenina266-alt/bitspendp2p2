/**
 * Adversarial Security Rules Specification Tests ("Dirty Dozen")
 * Verifies all 12 invariant violations fail with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Private User Account',
    operation: 'update',
    path: '/users/uid_victim',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: { bio: 'Hijacked' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Update / Privilege Escalation on /users/{uid}',
    operation: 'create',
    path: '/users/uid_attacker',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'uid_attacker',
      username: 'attacker',
      isAdmin: true,
      role: 'superadmin',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Email Spoof Attack (Unverified Admin Email)',
    operation: 'list',
    path: '/users',
    auth: { uid: 'uid_spoof', email: 'filipbergstrom52@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII & Wallet Read',
    operation: 'get',
    path: '/users/uid_victim',
    auth: { uid: 'uid_other', email: 'other@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Offer Ownership Spoofing on Create',
    operation: 'create',
    path: '/offers/off-spoof1',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'off-spoof1',
      ownerUid: 'uid_victim',
      side: 'sell_crypto',
      traderUsername: 'victim',
      crypto: 'BTC',
      fiat: 'USD',
      paymentMethod: 'Zelle',
      active: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Non-Owner Offer Modification',
    operation: 'update',
    path: '/offers/off-legit1',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: { active: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Trader Desk Creation Without Atomic Username Claim',
    operation: 'create',
    path: '/traders/orphan_desk',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      ownerUid: 'uid_attacker',
      username: 'orphan_desk',
      lowerUsername: 'orphan_desk',
      isRegisteredUser: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Terminal State Rollback on Completed Trade',
    operation: 'update',
    path: '/trades/TRD-DONE1',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: { status: 'escrow_funded', cryptoAmount: 999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Buyer Attempting Seller-Only Escrow Release',
    operation: 'update',
    path: '/trades/TRD-REAL2',
    auth: { uid: 'uid_buyer', email: 'buyer@example.com', email_verified: true },
    payload: { status: 'completed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Master Gate Bypass on Trade Messages Subcollection',
    operation: 'create',
    path: '/trades/TRD-REAL2/messages/msg-evil',
    auth: { uid: 'uid_outsider', email: 'outsider@example.com', email_verified: true },
    payload: { id: 'msg-evil', sender: 'outsider', senderUid: 'uid_outsider', text: 'fake escrow' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'ID Poisoning (>128 chars) & Unbounded Tags Injection',
    operation: 'create',
    path: `/offers/${'x'.repeat(200)}`,
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: { id: 'x'.repeat(200), tags: Array(25).fill('No ID Required') },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket Query Scraping on Direct Chats',
    operation: 'list',
    path: '/chats',
    auth: { uid: 'uid_outsider', email: 'outsider@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
