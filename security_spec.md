# Security Specification

## 1. Data Invariants
1. Debtors must belong to the authenticated user (`userId == request.auth.uid`).
2. Transactions must reference an existing debtor and belong to the authenticated user.
3. Every document ID must be valid and conform to alphanumeric and dash/underscore characters with length <= 128.
4. Transaction amounts must be strictly positive numbers.
5. All reads and lists are scoped by `userId == request.auth.uid`. No cross-account data leaking.
6. Identity fields cannot be spoofed; `userId` must match `request.auth.uid`.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. Missing auth: Write with `request.auth == null` -> DENY
2. User ID spoofing: Creating debtor with `userId != request.auth.uid` -> DENY
3. Negative debt transaction: `amount: -500` -> DENY
4. Huge ID string: Document ID of 2KB -> DENY
5. Invalid Transaction Type: `type: "REFUND_BONUS"` -> DENY
6. Cross-account Read: User A querying User B's transactions -> DENY
7. Cross-account Delete: User A attempting to delete User B's debtor -> DENY
8. Unbounded text fields: `name` with > 150 characters -> DENY
9. Invalid characters in Document ID: `deb/123?#` -> DENY
10. Blanket list query attempt without `userId` filter matching auth -> DENY
11. Settings overwrite by non-owner: Writing to another user's settings -> DENY
12. Zero amount transaction: `amount: 0` -> DENY
