# Firestore Security Specification

## 1. Data Invariants
- A `Block` document must have valid size constraints and cannot be overwritten by non-admin users.
- A `Transaction` document must have valid timestamp, sender, receiver, and amount strings.
- A `Wallet` document can only be written if the user owns the wallet or signed in.
- A `Proposal` document must have title under 128 chars, description under 1000 chars, non-negative cost and votes.
- A `Subscription` document must have valid customer and plan IDs.
- A `Contract` document must have valid name and contract_type strings.
- A `User` profile document at `/users/{userId}` can only be created/updated by the user matching `userId == request.auth.uid`.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Write to Users**: Attempting to create a user profile without auth.
2. **User Impersonation**: Attempting to write to `/users/victimUID` as `attackerUID`.
3. **Huge String Injection in Proposals**: Writing 50,000 character string in `description`.
4. **Negative Vote Count Tampering**: Setting `votes: -9999` in a proposal.
5. **Ghost Field Injection in Block**: Adding `isHacked: true` shadow key to `/blocks/{blockId}`.
6. **Malicious Transaction Amount Alteration**: Overwriting transaction amount to 0 or arbitrary text.
7. **Cross-User Wallet Takeover**: Updating someone else's wallet balance.
8. **Invalid Path Injection**: Injecting script tags or non-alphanumeric characters into document IDs.
9. **Admin Field Elevation**: Setting `isAdmin: true` on user profile payload.
10. **Unbounded Array Attack**: Injecting a 10,000 item list into contract ABI.
11. **Client Timestamp Spoofing**: Attempting to set future timestamp string instead of server timestamp validation.
12. **Blanket Query Scraping**: Listing all user profiles without filtering by ownership.

## 3. Verification Guidelines
All 12 payloads must return `PERMISSION_DENIED` under `firestore.rules`.
