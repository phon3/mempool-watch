import { http, HttpResponse } from 'msw';
import { Transaction, Chain, Stats, PaginatedResponse } from '../types/transaction';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const mockChains: Chain[] = [
    { id: 1, name: 'Ethereum', active: true },
    { id: 56, name: 'BSC', active: true },
];

const mockStats: Stats = {
    total: 1000,
    byStatus: { pending: 100, confirmed: 900 },
    byChain: { '1': 500, '56': 500 },
    topSenders: [{ address: '0x123', count: 10 }],
    recentCount: 50,
    txPerMinute: 10,
};

const mockTransaction: Transaction = {
    id: 'tx1',
    hash: '0x123abc',
    chainId: 1,
    from: '0xsender',
    to: '0xreceiver',
    value: '1000000000000000000',
    gasPrice: '20000000000',
    gasLimit: '21000',
    input: '0x',
    nonce: 1,
    type: 2,
    timestamp: new Date().toISOString(),
    status: 'pending',
};

export const handlers = [
    http.get(`${API_URL}/chains`, () => {
        return HttpResponse.json(mockChains);
    }),

    http.get(`${API_URL}/stats`, () => {
        return HttpResponse.json(mockStats);
    }),

    http.get(`${API_URL}/transactions`, ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit')) || 50;
        const offset = Number(url.searchParams.get('offset')) || 0;

        // Generate dynamic transactions based on limit
        const transactions = Array(limit).fill(null).map((_, i) => ({
            ...mockTransaction,
            id: `tx-${offset + i}`,
            hash: `0xhash${offset + i}`,
        }));

        const response: PaginatedResponse<Transaction> = {
            transactions,
            pagination: {
                total: 1000,
                limit,
                offset,
                hasMore: offset + limit < 1000,
            },
        };

        return HttpResponse.json(response);
    }),

    http.get(`${API_URL}/transactions/:hash`, ({ params }) => {
        const { hash } = params;
        return HttpResponse.json({ ...mockTransaction, hash });
    }),
];
