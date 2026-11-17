import { eq } from 'drizzle-orm';
import { users, profiles, wallets, transactions } from '../../db/schema';
import { SEED_ACCOUNTS } from './seed-data';

export async function seedAllAccounts(db: any) {
  const now = Date.now();
  let seededCount = 0;

  for (const acc of SEED_ACCOUNTS) {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, acc.id),
    });

    if (!existing) {
      await db.insert(users).values({
        id: acc.id,
        email: acc.email,
        fullName: acc.fullName,
        role: acc.role,
        status: acc.status,
        rejectionReason: acc.rejectionReason || null,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(profiles).values({
        userId: acc.id,
        displayName: acc.displayName,
        avatarUrl: null,
        bio: acc.bio,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(wallets).values({
        id: `wallet_${acc.id}`,
        userId: acc.id,
        balance: acc.balance,
        totalWon: acc.totalWon,
        totalLost: acc.totalLost,
        matchesPlayed: acc.matchesPlayed,
        matchesWon: acc.matchesWon,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(transactions).values({
        id: `tx_${now}_${acc.id}`,
        walletId: `wallet_${acc.id}`,
        userId: acc.id,
        amount: acc.balance,
        balanceAfter: acc.balance,
        type: 'STARTING_GRANT',
        description: 'Vốn khởi nghiệp mặc định',
        createdAt: now,
      });

      seededCount++;
    } else {
      // Update profile and wallet if needed
      await db
        .update(profiles)
        .set({
          displayName: acc.displayName,
          bio: acc.bio,
          updatedAt: now,
        })
        .where(eq(profiles.userId, acc.id));

      await db
        .update(users)
        .set({
          role: acc.role,
          status: acc.status,
          rejectionReason: acc.rejectionReason || null,
          updatedAt: now,
        })
        .where(eq(users.id, acc.id));
    }
  }

  return { total: SEED_ACCOUNTS.length, newSeeded: seededCount };
}
