import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new cooperative",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'create-cooperative',
                [types.ascii("Farm Coop #1")],
                deployer.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Verify cooperative details
        let getCoopBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'get-cooperative',
                [types.principal(deployer.address)],
                deployer.address
            )
        ]);
        
        const cooperativeData = getCoopBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(cooperativeData['name'], "Farm Coop #1");
        assertEquals(cooperativeData['member-count'], types.uint(1));
    }
});

Clarinet.test({
    name: "Can join existing cooperative",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // First create a cooperative
        let block = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'create-cooperative',
                [types.ascii("Farm Coop #1")],
                deployer.address
            )
        ]);
        
        // Now try to join it
        let joinBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'join-cooperative',
                [types.principal(deployer.address)],
                wallet1.address
            )
        ]);
        
        joinBlock.receipts[0].result.expectOk().expectBool(true);
        
        // Verify membership
        let getMemberBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'get-member',
                [
                    types.principal(deployer.address),
                    types.principal(wallet1.address)
                ],
                wallet1.address
            )
        ]);
        
        const memberData = getMemberBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(memberData['reputation'], types.uint(0));
        assertEquals(memberData['shares'], types.uint(0));
    }
});

Clarinet.test({
    name: "Can create and vote on proposals",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Create cooperative
        let block = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'create-cooperative',
                [types.ascii("Farm Coop #1")],
                deployer.address
            )
        ]);
        
        // Create proposal
        let proposalBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'create-proposal',
                [
                    types.principal(deployer.address),
                    types.ascii("Buy Tractor"),
                    types.ascii("We should buy a new tractor"),
                    types.uint(30)
                ],
                deployer.address
            )
        ]);
        
        const proposalId = proposalBlock.receipts[0].result.expectOk();
        
        // Vote on proposal
        let voteBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'vote',
                [
                    proposalId,
                    types.bool(true)
                ],
                deployer.address
            )
        ]);
        
        voteBlock.receipts[0].result.expectOk().expectBool(true);
        
        // Verify proposal status
        let getProposalBlock = chain.mineBlock([
            Tx.contractCall('harvest_dao', 'get-proposal',
                [proposalId],
                deployer.address
            )
        ]);
        
        const proposalData = getProposalBlock.receipts[0].result.expectSome().expectTuple();
        assertEquals(proposalData['yes-votes'], types.uint(1));
        assertEquals(proposalData['no-votes'], types.uint(0));
    }
});