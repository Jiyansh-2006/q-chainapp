pragma circom 2.1.4;

template TxVerification() {
    signal input amount;
    signal input balance;
    signal input nonce;
    signal input txTime;
    signal input now;
    signal input maxAmount;

    // amount > 0
    amount > 0;

    // amount <= max
    amount <= maxAmount;

    // balance >= amount
    balance >= amount;

    // nonce exists
    nonce > 0;

    // freshness
    now - txTime < 120;
}

component main = TxVerification();
