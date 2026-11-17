# OOSAB Security Specification (Payload-First Security TDD)

## 1. Data Invariants
1. **Identity & PII Isolation (`/users/{uid}` vs `/traders/{username}` vs `/usernames/{lowerUsername}`)**:
   - Private user accounts (`/users/{uid}`) contain wallet balances, deposit addresses, recovery phrases, and settings. Only the authenticated owner (`request.auth.uid == uid` with `email_verified == true`) or bootstrapped admin (`filipbergstrom52@gmail.com`) may read or write `/users/{uid}`.
   - Public trader profiles (`/traders/{username}`) contain zero PII (no email, recovery phrase, or wallet balances). Every `/traders/{username}` creation requires `existsAfter(/databases/$(database)/documents/usernames/$(incoming().lowerUsername))` in the same atomic batch.
   - Username uniqueness (`/usernames/{lowerUsername}`) is immutable on creation and prevents claiming an already-registered handle.
2. **Offer Integrity (`/offers/{offerId}`)**:
   - Every offer must have `ownerUid == request.auth.uid` on creation, valid side (`sell_crypto`, `buy_crypto`, `swap_crypto`), bounded strings, `tags.size() <= 10`, and `createdAt == request.time`.
   - Only the offer owner (`existing().ownerUid == request.auth.uid`) or admin may pause/edit margin or delete an offer.
3. **Escrow Trade Isolation & Terminal Locking (`/trades/{tradeId}` & `/trades/{tradeId}/messages/{msgId}`)**:
   - Only `participantUids` (`buyerUid` / `sellerUid`) or admin may `get`, `list`, or `update` a trade room, or read/write messages in `/trades/{tradeId}/messages`.
   - Once a trade reaches terminal state (`completed` or `cancelled`), `status`, `cryptoAmount`, `fiatAmount`, and `participantUids` are locked forever (only settlement claim flags, read cursors, or feedback may be recorded).
4. **Direct Chat Isolation (`/chats/{chatId}` & `/chats/{chatId}/messages/{msgId}`)**:
   - Strictly restricted to `request.auth.uid in participantUids` (`participantUids.size() <= 2`). Message subcollection enforces Master Gate `get()` on parent `/chats/{chatId}`.
5. **Notifications, Swaps & Cards Isolation**:
   - `/notifications/{notifId}` can only be read or marked `read` by `toUid == request.auth.uid` (and created with `fromUid == request.auth.uid`).
   - `/swaps/{swapId}` and `/cards/{cardId}` are strictly `ownerUid == request.auth.uid`.
6. **Verified Auth & Temporal Integrity**:
   - All authenticated writes require `request.auth.token.email_verified == true`.
   - All `createdAt` / `updatedAt` timestamps must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on User Profile**: Unrelated user `uid_attacker` attempts `create` or `update` on `/users/uid_victim`. -> `PERMISSION_DENIED`.
2. **Self-Assigned Privilege Escalation**: User inserts `{ isAdmin: true, role: "admin" }` during `/users/{uid}` creation or update ("Shadow Field"). -> `PERMISSION_DENIED`.
3. **Email Verification Spoof**: Signed-in user with `email: "filipbergstrom52@gmail.com"` and `email_verified: false` attempts admin access. -> `PERMISSION_DENIED`.
4. **PII Cross-User Read**: Signed-in user `uid_b` calls `get(/users/uid_a)` or `list(/users)`. -> `PERMISSION_DENIED`.
5. **Offer Ownership Hijack**: Attacker creates `/offers/off-hack1` with `ownerUid: "uid_victim"` instead of `request.auth.uid`. -> `PERMISSION_DENIED`.
6. **Offer Price/Terms Tampering by Non-Owner**: Non-owner updates `marginPct` or `active` on someone else's `/offers/{offerId}`. -> `PERMISSION_DENIED`.
7. **Orphaned Trader Desk Creation**: Attacker creates `/traders/fake` without atomically claiming `/usernames/fake`. -> `PERMISSION_DENIED`.
8. **Escrow Trade State Rollback**: Participant attempts to change `/trades/TRD-1` from `status: "completed"` back to `"escrow_funded"` or alter `cryptoAmount`. -> `PERMISSION_DENIED`.
9. **Unauthorized Escrow Release**: Buyer (`uid_buyer`) attempts to invoke `release` on a 2-user trade where `sellerUid == "uid_seller"`. -> `PERMISSION_DENIED`.
10. **Subcollection Master Gate Bypass**: Attacker not in parent `/trades/TRD-1` `participantUids` attempts to read or write `/trades/TRD-1/messages/msg-1`. -> `PERMISSION_DENIED`.
11. **Denial-of-Wallet ID Poisoning & Unbounded Array**: Attacker uses a 500-char document ID `/offers/<500 chars>` or passes 50 tags in `tags`. -> `PERMISSION_DENIED`.
12. **Client-Trusted Query Scraping**: Non-participant runs `list` on `/chats` or `/notifications` without matching `participantUids` / `toUid`. -> `PERMISSION_DENIED`.
