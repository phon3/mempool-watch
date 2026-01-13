// Quick test script to verify pending transaction subscriptions
require('dotenv').config();
const WebSocket = require('ws');

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const CHAIN = process.argv[2] || 'eth-mainnet';

if (!ALCHEMY_KEY) {
    console.error('ALCHEMY_API_KEY not found in .env');
    process.exit(1);
}

const urls = {
    'eth-mainnet': `wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    'base-mainnet': `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    'arb-mainnet': `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    'monad-mainnet': `wss://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

const wsUrl = urls[CHAIN];
if (!wsUrl) {
    console.log('Usage: node test-pending.js [eth-mainnet|base-mainnet|arb-mainnet|monad-mainnet]');
    process.exit(1);
}

console.log(`Testing newPendingTransactions on ${CHAIN}...`);
console.log(`URL: ${wsUrl.replace(ALCHEMY_KEY, '***')}`);

const ws = new WebSocket(wsUrl);
let count = 0;

ws.on('open', () => {
    console.log('Connected!');

    const subscribeMsg = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
    };

    ws.send(JSON.stringify(subscribeMsg));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.id === 1) {
        console.log('Subscribed! ID:', msg.result);
        console.log('Waiting for transactions (will show first 5)...\n');
    } else if (msg.method === 'eth_subscription') {
        count++;
        console.log(`TX #${count}: ${msg.params.result}`);
        if (count >= 5) {
            console.log('\n✅ Test passed! Received 5 transactions.');
            ws.close();
            process.exit(0);
        }
    } else if (msg.error) {
        console.error('Error:', msg.error);
        ws.close();
        process.exit(1);
    }
});

ws.on('error', (err) => {
    console.error('WebSocket Error:', err.message);
    process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
    console.log(`\n⚠️ Timeout! Only received ${count} transactions in 30 seconds.`);
    ws.close();
    process.exit(count > 0 ? 0 : 1);
}, 30000);
