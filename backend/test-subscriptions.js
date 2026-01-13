// Comprehensive test script for all Alchemy subscription methods
require('dotenv').config();
const WebSocket = require('ws');

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
if (!ALCHEMY_KEY) {
    console.error('ALCHEMY_API_KEY not found in .env');
    process.exit(1);
}

const CHAIN = process.argv[2] || 'eth-mainnet';
const METHOD = process.argv[3] || 'auto';

const chainConfigs = {
    'eth-mainnet': {
        url: `wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
        chainId: 1,
        defaultMethod: 'alchemy_pendingTransactions'
    },
    'base-mainnet': {
        url: `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
        chainId: 8453,
        defaultMethod: 'alchemy_minedTransactions'
    },
    'arb-mainnet': {
        url: `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
        chainId: 42161,
        defaultMethod: 'alchemy_minedTransactions'
    },
    'monad-mainnet': {
        url: `wss://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
        chainId: 143,
        defaultMethod: 'monadNewHeads'
    }
};

const config = chainConfigs[CHAIN];
if (!config) {
    console.log('Usage: node test-subscriptions.js [chain] [method]');
    console.log('Chains:', Object.keys(chainConfigs).join(', '));
    console.log('Methods: alchemy_pendingTransactions, alchemy_minedTransactions, newPendingTransactions, newHeads, monadNewHeads, logs');
    process.exit(1);
}

const subscriptionMethod = METHOD === 'auto' ? config.defaultMethod : METHOD;

console.log(`\n=== Testing ${subscriptionMethod} on ${CHAIN} ===`);
console.log(`URL: ${config.url.replace(ALCHEMY_KEY, '***')}\n`);

const ws = new WebSocket(config.url);
let count = 0;
const MAX_EVENTS = 3;

ws.on('open', () => {
    console.log('✅ Connected!\n');

    let params;
    switch (subscriptionMethod) {
        case 'alchemy_pendingTransactions':
            params = ['alchemy_pendingTransactions', { hashesOnly: false }];
            break;
        case 'alchemy_minedTransactions':
            params = ['alchemy_minedTransactions', { hashesOnly: false }];
            break;
        case 'newPendingTransactions':
            params = ['newPendingTransactions'];
            break;
        case 'newHeads':
            params = ['newHeads'];
            break;
        case 'monadNewHeads':
            params = ['monadNewHeads'];
            break;
        case 'monadLogs':
            params = ['monadLogs', { topics: [] }];
            break;
        case 'logs':
            // Subscribe to all Transfer events (ERC20)
            params = ['logs', { topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] }];
            break;
        default:
            params = [subscriptionMethod];
    }

    console.log(`Subscribing with params: ${JSON.stringify(params)}\n`);

    ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.id === 1) {
        if (msg.error) {
            console.log('❌ Subscription failed:', msg.error.message);
            ws.close();
            process.exit(1);
        }
        console.log('✅ Subscribed! ID:', msg.result);
        console.log(`Waiting for events (will show first ${MAX_EVENTS})...\n`);
    } else if (msg.method === 'eth_subscription') {
        count++;
        const result = msg.params.result;

        console.log(`--- Event #${count} ---`);

        // Format based on what we receive
        if (typeof result === 'string') {
            // Hash only
            console.log(`Hash: ${result}`);
        } else if (result.hash && result.from) {
            // Transaction object
            console.log(`TX Hash: ${result.hash}`);
            console.log(`From: ${result.from}`);
            console.log(`To: ${result.to || 'Contract Creation'}`);
            console.log(`Value: ${BigInt(result.value || '0x0').toString()} wei`);
        } else if (result.number !== undefined) {
            // Block header (newHeads/monadNewHeads)
            console.log(`Block: ${parseInt(result.number, 16)}`);
            console.log(`Hash: ${result.hash}`);
            console.log(`Txs Root: ${result.transactionsRoot}`);
            if (result.commitState) {
                console.log(`Commit State: ${result.commitState}`);
            }
        } else if (result.address && result.topics) {
            // Log event
            console.log(`Contract: ${result.address}`);
            console.log(`Topics: ${result.topics.length}`);
            console.log(`TX Hash: ${result.transactionHash}`);
        } else {
            console.log(JSON.stringify(result, null, 2).slice(0, 500));
        }
        console.log('');

        if (count >= MAX_EVENTS) {
            console.log(`\n✅ SUCCESS! Received ${MAX_EVENTS} events from ${subscriptionMethod} on ${CHAIN}`);
            ws.close();
            process.exit(0);
        }
    }
});

ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err.message);
    process.exit(1);
});

// Timeout after 45 seconds
setTimeout(() => {
    console.log(`\n⚠️ Timeout! Received ${count} events in 45 seconds.`);
    if (count > 0) {
        console.log('Partial success - some data received');
        process.exit(0);
    } else {
        console.log('No data received - this method may not work for this chain');
        process.exit(1);
    }
}, 45000);
