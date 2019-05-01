const BN = require('bn.js');
const time = require('./helpers/timeHelper');
const h = require('./helpers/utils');

const SlicToken = artifacts.require("./SlicToken");
const SlicDeploymentToken = artifacts.require("./SlicDeploymentToken");
let slic_main;



contract("SlicToken", (accounts) => {
    let icoManagerAddress = accounts[0];
    let adminAddress = accounts[1];
    beforeEach(async () => {
        slic_main = await SlicToken.new(adminAddress, { from: icoManagerAddress });
    });

    it('creation: should create an initial total supply of 0', async () => {
        // slic_main = await SlicToken.deployed();
        const totalSupply = await slic_main.totalSupply.call();
        assert.strictEqual(totalSupply.toNumber(), 0);
    });

    it('first deployment: should mint 16429638 tokens for the first deployment', async () => {
        // slic_main = await SlicToken.deployed();
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});
        const totalSupply = await slic_main.totalSupply();
        const decimals = await slic_main.decimals.call();

        assert.strictEqual(totalSupply.cmp(new BN(16429638).mul(new BN(10).pow(decimals))), 0);
    });

    it('deployment: should mint the correct amount of tokens for all and each deployment', async () => {
        // slic_main = await SlicToken.deployed();
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});
        await slic_main.createDeploymentToken(2, {from: icoManagerAddress});
        let totalSupply = await slic_main.totalSupply();
        let decimals = await slic_main.decimals.call();

        assert.strictEqual(totalSupply.cmp(new BN(16429638 + 12500000).mul(new BN(10).pow(decimals))), 0);

        for(var i = 3; i <= 60; i++) {
            await slic_main.createDeploymentToken(i, {from: icoManagerAddress});
            if(i == 3 || i == 10) {
                const subtokenR2a = await slic_main.deploymentTokens.call(i);
                const slic_subR2a = await SlicDeploymentToken.at(subtokenR2a);
                const totalSupply = await slic_subR2a.totalSupply();
                const decimals = await slic_subR2a.decimals.call();

                assert.strictEqual(totalSupply.cmp(new BN(12500000).mul(new BN(10).pow(decimals))), 0);
            }
            if(i == 11 || i == 20) {
                const subtokenR2b = await slic_main.deploymentTokens.call(i);
                const slic_subR2b = await SlicDeploymentToken.at(subtokenR2b);
                const totalSupply = await slic_subR2b.totalSupply();
                const decimals = await slic_subR2b.decimals.call();

                assert.strictEqual(totalSupply.cmp(new BN(9765625).mul(new BN(10).pow(decimals))), 0);
            }
            if(i == 21 || i == 40) {
                const subtokenR3 = await slic_main.deploymentTokens.call(i);
                const slic_subR3 = await SlicDeploymentToken.at(subtokenR3);
                const totalSupply = await slic_subR3.totalSupply();
                const decimals = await slic_subR3.decimals.call();

                assert.strictEqual(totalSupply.cmp(new BN(7812500).mul(new BN(10).pow(decimals))), 0);
            }
            if(i == 41 || i == 60) {
                const subtokenR4 = await slic_main.deploymentTokens.call(i);
                const slic_subR4 = await SlicDeploymentToken.at(subtokenR4);
                const totalSupply = await slic_subR4.totalSupply();
                const decimals = await slic_subR4.decimals.call();

                assert.strictEqual(totalSupply.cmp(new BN(6250000).mul(new BN(10).pow(decimals))), 0);
            }
        }

        totalSupply = await slic_main.totalSupply();
        assert.strictEqual(totalSupply.cmp(new BN(507835888).mul(new BN(10).pow(decimals))), 0);
    });

    it('second deployment: should distribute 1000 subtokens from the second deployment to acc[2]', async () => {
        // slic_main = await SlicToken.deployed();
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});
        await slic_main.createDeploymentToken(2, {from: icoManagerAddress});

        const subtoken1 = await slic_main.deploymentTokens.call(1);
        const slic_sub1 = await SlicDeploymentToken.at(subtoken1);
        await slic_main.distribute(accounts[2], 1000, 1, {from: icoManagerAddress});
        let balanceAcc1Sub1 = await slic_sub1.balanceOf.call(accounts[2]);
        assert.strictEqual(balanceAcc1Sub1.cmp(new BN(1000)), 0);

        const subtoken2 = await slic_main.deploymentTokens.call(2);
        const slic_sub2 = await SlicDeploymentToken.at(subtoken2);
        await slic_main.distribute(accounts[2], 1000, 2, {from: icoManagerAddress});
        const balanceAcc1Sub = await slic_sub2.balanceOf.call(accounts[2]);
        assert.strictEqual(balanceAcc1Sub.cmp(new BN(1000)), 0);

        await slic_main.startLockUpCountdown(1, {from: icoManagerAddress});
        await slic_main.startLockUpCountdown(2, {from: icoManagerAddress});

        const unlockTime2 = await slic_sub2.unlockTime.call();
        const lastblock = await web3.eth.getBlock();
        assert.isTrue(unlockTime2 - (180 * 24 * 60 * 60) > lastblock.timestamp);
        const lastblock2 = await time.advanceTimeAndBlock((183 * 24 * 60 * 60));
        assert.isTrue(unlockTime2 < lastblock2.timestamp);

        await slic_main.redeemUnlockedTokens(2, {from: accounts[2]});
        const balanceAcc1Sub2 = await slic_sub2.balanceOf.call(accounts[2]);
        let balanceAcc1Main = await slic_main.balanceOf.call(accounts[2]);
        assert.strictEqual(balanceAcc1Sub2.cmp(new BN(0)), 0);
        assert.strictEqual(balanceAcc1Main.cmp(new BN(1000)), 0);

        await slic_main.forceRedeemUnlockedTokens(1, accounts[2], {from: icoManagerAddress});
        balanceAcc1Sub1 = await slic_sub1.balanceOf.call(accounts[2]);
        balanceAcc1Main = await slic_main.balanceOf.call(accounts[2]);
        assert.strictEqual(balanceAcc1Sub1.cmp(new BN(0)), 0);
        assert.strictEqual(balanceAcc1Main.cmp(new BN(2000)), 0);
    });

    it('token holders: should track the current main token holders set', async () => {
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});

        await slic_main.distribute(accounts[2], 2000, 1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[3], 3000, 1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[4], 4000, 1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[5], 5000, 1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[6], 6000, 1, {from: icoManagerAddress});


        const subtoken1 = await slic_main.deploymentTokens.call(1);
        const slic_sub1 = await SlicDeploymentToken.at(subtoken1);
        await slic_main.startLockUpCountdown(1, {from: icoManagerAddress});
        await time.advanceTimeAndBlock((183 * 24 * 60 * 60));
        await slic_main.redeemUnlockedTokens(1, {from: accounts[2]});
        await slic_main.redeemUnlockedTokens(1, {from: accounts[3]});
        await slic_main.redeemUnlockedTokens(1, {from: accounts[4]});
        await slic_main.redeemUnlockedTokens(1, {from: accounts[5]});
        await slic_main.redeemUnlockedTokens(1, {from: accounts[6]});

        let holdersSet = await slic_main.getHolders.call({from: icoManagerAddress});
        assert.isTrue(holdersSet.includes(accounts[4]));

        await slic_main.transfer(accounts[7], 4000, {from: accounts[4]});
        await slic_main.transfer(accounts[7], 3000, {from: accounts[3]});

        holdersSet = await slic_main.getHolders.call({from: accounts[2]});
        assert.isFalse(holdersSet.includes(accounts[4]));
        assert.isTrue(holdersSet.includes(accounts[7]));

        // zero tokens transfer does not add the receiver to the holders set
        await slic_main.distribute(accounts[8], 0, 1, {from: icoManagerAddress});
        await slic_main.redeemUnlockedTokens(1, {from: accounts[8]});
        holdersSet = await slic_main.getHolders.call({from: icoManagerAddress});
        assert.isFalse(holdersSet.includes(accounts[8]));

        // last holder does not remain a holder after transferring out all of their tokens
        await slic_main.transfer(accounts[2], 7000, {from: accounts[7]});
        holdersSet = await slic_main.getHolders.call({from: icoManagerAddress});
        assert.isFalse(holdersSet.includes(accounts[7]));
    });

    it('admin access: the admin can freeze a token holder', async () => {
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[2], 1000, 1, {from: icoManagerAddress});
        const subtoken1 = await slic_main.deploymentTokens.call(1);
        const slic_sub1 = await SlicDeploymentToken.at(subtoken1);
        await slic_main.startLockUpCountdown(1, {from: icoManagerAddress});
        await time.advanceTimeAndBlock((183 * 24 * 60 * 60));
        await slic_main.redeemUnlockedTokens(1, {from: accounts[2]});

        let isFrozen = await slic_main.frozen(accounts[2]);
        assert.isFalse(isFrozen);

        let isSuccessfulTransfer = await slic_main.transfer.call(accounts[3], 1, {from: accounts[2]});
        assert.isTrue(isSuccessfulTransfer);

        await slic_main.freeze(accounts[2], true, {from: adminAddress});

        isFrozen = await slic_main.frozen(accounts[2]);
        assert.isTrue(isFrozen);

        isSuccessfulTransfer = await slic_main.transfer.call(accounts[3], 1, {from: accounts[2]});
        assert.isFalse(isSuccessfulTransfer);
    });


    it('admin access: no other address can freeze a token holder', async () => {
        await slic_main.createDeploymentToken(1, {from: icoManagerAddress});
        await slic_main.distribute(accounts[2], 1000, 1, {from: icoManagerAddress});
        const subtoken1 = await slic_main.deploymentTokens.call(1);
        const slic_sub1 = await SlicDeploymentToken.at(subtoken1);
        await slic_main.startLockUpCountdown(1, {from: icoManagerAddress});
        await time.advanceTimeAndBlock((183 * 24 * 60 * 60));
        await slic_main.redeemUnlockedTokens(1, {from: accounts[2]});

        let isFrozen = await slic_main.frozen(accounts[2]);
        assert.isFalse(isFrozen);

        await h.assertRevert(slic_main.freeze(accounts[2], true, {from: accounts[7]}));
    });
});

