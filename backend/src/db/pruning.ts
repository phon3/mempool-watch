import prisma from './client.js';

const PRUNING_INTERVAL = 60 * 60 * 1000; // 1 hour
const RETENTION_HOURS = 24; // Keep transactions from last 24 hours

let pruningInterval: NodeJS.Timeout | null = null;

/**
 * Delete transactions older than RETENTION_HOURS
 */
async function pruneOldTransactions(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);

    try {
        const result = await prisma.transaction.deleteMany({
            where: {
                timestamp: { lt: cutoff }
            }
        });

        if (result.count > 0) {
            console.log(`[Pruning] Deleted ${result.count} transactions older than ${RETENTION_HOURS}h`);
        }

        return result.count;
    } catch (error) {
        console.error('[Pruning] Error pruning transactions:', error);
        return 0;
    }
}

/**
 * Start the pruning scheduler
 */
export function startPruning(): void {
    if (pruningInterval) {
        console.log('[Pruning] Already running');
        return;
    }

    console.log(`[Pruning] Starting scheduler (every ${PRUNING_INTERVAL / 1000 / 60} minutes, keep last ${RETENTION_HOURS}h)`);

    // Run immediately on startup
    pruneOldTransactions();

    // Then run periodically
    pruningInterval = setInterval(pruneOldTransactions, PRUNING_INTERVAL);
}

/**
 * Stop the pruning scheduler
 */
export function stopPruning(): void {
    if (pruningInterval) {
        clearInterval(pruningInterval);
        pruningInterval = null;
        console.log('[Pruning] Stopped');
    }
}

export { pruneOldTransactions };
