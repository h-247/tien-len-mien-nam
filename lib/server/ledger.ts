import { getAppDb } from './db';
import { wallets, transactions, auditLogs, gameSettlements } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { SettlementResult } from '../tienlen/types';

export interface BalanceChangeParams {
  userId: string;
  amount: number; // in VND (can be positive or negative)
  type: 'STARTING_GRANT' | 'MATCH_SETTLEMENT' | 'CHOP_BONUS' | 'CHOP_PENALTY' | 'ADMIN_ADJUSTMENT';
  referenceType?: 'round' | 'admin' | 'system';
  referenceId?: string;
  description: string;
  adminUserId?: string;
}

export async function applyBalanceChange(params: BalanceChangeParams) {
  const db = await getAppDb();
  const now = Date.now();

  const userWallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, params.userId),
  });

  if (!userWallet) {
    throw new Error(`Ví của người chơi ${params.userId} không tồn tại.`);
  }

  const newBalance = userWallet.balance + params.amount;
  if (newBalance < 0) {
    throw new Error(
      `Số dư không đủ để thực hiện giao dịch (Số dư hiện tại: ${userWallet.balance.toLocaleString('vi-VN')} ₫, Yêu cầu trừ: ${Math.abs(params.amount).toLocaleString('vi-VN')} ₫).`
    );
  }

  const txId = `tx_${now}_${Math.random().toString(36).substring(2, 9)}`;

  // Insert transaction ledger record
  await db.insert(transactions).values({
    id: txId,
    walletId: userWallet.id,
    userId: params.userId,
    amount: params.amount,
    balanceAfter: newBalance,
    type: params.type,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description,
    createdAt: now,
  });

  // Update wallet
  const totalWonIncrement = params.amount > 0 ? params.amount : 0;
  const totalLostIncrement = params.amount < 0 ? Math.abs(params.amount) : 0;

  await db
    .update(wallets)
    .set({
      balance: newBalance,
      totalWon: userWallet.totalWon + totalWonIncrement,
      totalLost: userWallet.totalLost + totalLostIncrement,
      updatedAt: now,
    })
    .where(eq(wallets.id, userWallet.id));

  // If admin action, record audit log
  if (params.adminUserId) {
    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 9)}`;
    await db.insert(auditLogs).values({
      id: auditId,
      adminUserId: params.adminUserId,
      action: 'ADJUST_BALANCE',
      targetType: 'user_wallet',
      targetId: params.userId,
      details: JSON.stringify({
        amount: params.amount,
        balanceBefore: userWallet.balance,
        balanceAfter: newBalance,
        reason: params.description,
      }),
      createdAt: now,
    });
  }

  return { newBalance, transactionId: txId };
}

export async function recordRoundSettlement(
  roundId: string,
  roomId: string,
  settlement: SettlementResult,
  isSimulated = false
) {
  const db = await getAppDb();
  const now = Date.now();

  // Save settlement record
  const settlementId = `stl_${roundId}`;
  await db.insert(gameSettlements).values({
    id: settlementId,
    roundId,
    roomId,
    stake: settlement.stake,
    settlementData: JSON.stringify(settlement),
    totalChopBonuses: settlement.totalChopBounties,
    totalPenalties: settlement.players.reduce((s, p) => s + p.thoiPenalties, 0),
    createdAt: now,
  });

  // If match with bots (simulation mode): money is simulated, do NOT modify real wallet or transactions!
  if (isSimulated) {
    return;
  }

  // Apply balance change and match statistics for each human player
  for (const p of settlement.players) {
    if (p.userId && !p.isBot) {
      const posVi =
        p.finishedPosition === 1
          ? 'về Nhất'
          : p.finishedPosition === 2
          ? 'về Nhì'
          : p.finishedPosition === 3
          ? 'về Ba'
          : 'về Bét';

      const desc = `Kết toán ván đấu #${roundId.split('_').pop()}: ${posVi} (${p.netChange >= 0 ? '+' : ''}${p.netChange.toLocaleString('vi-VN')} ₫)`;

      // Apply balance change
      await applyBalanceChange({
        userId: p.userId,
        amount: p.netChange,
        type: 'MATCH_SETTLEMENT',
        referenceType: 'round',
        referenceId: roundId,
        description: desc,
      });

      // Update match stats (matchesPlayed, matchesWon)
      const userWallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, p.userId),
      });

      if (userWallet) {
        await db
          .update(wallets)
          .set({
            matchesPlayed: userWallet.matchesPlayed + 1,
            matchesWon: p.finishedPosition === 1 ? userWallet.matchesWon + 1 : userWallet.matchesWon,
            updatedAt: now,
          })
          .where(eq(wallets.id, userWallet.id));
      }
    }
  }
}
