# Learn about Solidity Hacks and Vulnerabilities

Summary:

-   [Reentrancy](#reentrancy)
    -   [Single Function Reentrancy](#single-function-reentrancy)
    -   [Cross-Function Reentrancy](#cross-function-reentrancy)
    -   [Read Only Reentrancy](#read-only-reentrancy)
    -   [OpenZeppelin ERC721 Reentrancy](#openzeppelin-erc721-reentrancy)
-   [Forcefuly send ETH to a contract](#forcefuly-send-eth-to-a-contract)
-   [Accessing Private State Variables](#accessing-private-state-variables)
-   [Insecure Source of Randomness](#insecure-source-of-randomness)
-   [Denial of Service](#denial-of-service)
    -   [Reject Ether transfer](#reject-ether-transfer)
    -   [DoS with Block Gas Limit](#dos-with-block-gas-limit)
-   [Phishing with tx.origin](#phishing-with-txorigin)
-   [Front Running](#front-running)
-   [Block timestamp manipulation](#block-timestamp-manipulation)
-   [Signature replay attack](#signature-replay-attack)
-   [Contract with Zero Code Size](#contract-with-zero-code-size)

# Reentrancy

In Solidity, the reentrancy vulnerability is a type of security vulnerability where a function can be recursively called before its first invocation is finished, allowing an attacker to potentially change the state of the contract in unexpected ways. As the name of the hack suggests, this vulnerability is often exploited by calling back into the vulnerable contract, reentering the same function that is currently being executed and modifying the state of the contract before the first invocation is finished.

## Single Function Reentrancy

### POC

-   Contracts: [Reentrancy.sol](contracts/Reentrancy.sol)
-   Test: `yarn hardhat test test/reentrancy.ts`

#### The DAO Hack

The DAO hack is one of the most famous hacks in the history of Ethereum. The DAO was a decentralized autonomous organization that was created to act as a venture capital fund for the crypto and decentralized space. It was the victim of a reentrancy attack that allowed the attacker to drain 3.6 million ether from the DAO. The attacker was able to drain the funds by recursively calling the withdraw function of the DAO contract before the first invocation was finished and so their balance was not updated with each withdrawal, only the final one on the first invocation finish. It led to a hard fork of the Ethereum blockchain and the creation of Ethereum Classic.

Read more about it [here](https://medium.com/swlh/the-story-of-the-dao-its-history-and-consequences-71e6a8a551ee).

### Solutions:

-   Use the `Checks-Effects-Interactions` pattern, to ensure that all code paths through a contract complete all required checks of the supplied parameters before modifying the contract’s state (Checks); only then it makes any changes to the state (Effects); it may make calls to functions in other contracts after all planned state changes have been written to storage (Interactions). This is a common foolproof way to prevent reentrancy attacks, where an externally called malicious contract can double-spend an allowance, double-withdraw a balance, among other things, by using logic that calls back into the original contract before it has finalized its transaction.

Example:

```solidity
    // Mapping of ether shares of the contract.
    mapping(address => uint) shares;

    // Vulnerable to reentrancy attack, because it calls an external contract before implementing the effects of the function.
    function withdraw() public {
        require(shares[msg.sender] > 0);
        (bool success,) = msg.sender.call{value: _amount}("");
        if (success)
            shares[msg.sender] = 0;
    }

    // `Checks-Effects-Interactions` pattern
    // Safe from reentrancy attack, because it implements the effects of the function before calling an external contract.
    function withdraw() public {
        // Checks
        require(shares[msg.sender] > 0);
        // Effects
        uint256 amount = shares[msg.sender];
        shares[msg.sender] = 0;
        // Interactions
        (bool success,) = msg.sender.call{value: amount}("");
    }


```

-   Use `Reentrancy Guards` like the OpenZeppelin ReentrancyGuard.sol contract. This contract implements a nonReentrant modifier that can be used to prevent reentrancy attacks. It is important to note that this contract only protects external function calls, and that external calls to nonReentrant functions are still vulnerable to reentrancy attacks. To protect against this, you can use the nonReentrant modifier in the function that calls the internal function. This solution is not the optimal one, since it costs more gas for adding

```solidity
    // Mapping of ether shares of the contract.
    mapping(address => uint) shares;
    // bool representing whether function is currently being executed.
    bool entered = false;

    // Reentrancy Guard sets entered to true before executing the function and sets it to false after
    // the function is finished so if the function is called again before it is finished, it will revert.
    modifier nonReentrant() {
        require(!entered);
        entered = true;
        _;
        entered = false;
    }

    // Would be vulnerable to reentrancy attack, because it calls an external contract before implementing the
    // effects of the function in the body, but the nonReentrant modifier prevents this.
    function withdraw() public nonReentrant {
        require(shares[msg.sender] > 0);
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        if (success)
            shares[msg.sender] = 0;
    }
```

## Cross-Function Reentrancy

### POC

-   Contracts: [CrossFunctionReentrancy.sol](contracts/CrossFunctionReentrancy.sol)
-   Test: `yarn test test/crossFunctionReentrancy.ts`

### Solutions:

Same as in the Single Function Reentrancy, the `Checks-Effects-Interactions` pattern can be used to prevent reentrancy attacks, but now the `Reentrancy Guard` is no longer useful, since the function that is doing the callback is not reentered. Please see the example below and in the [PoC](contracts/CrossFunctionReentrancy.sol):

```solidity
    mapping(address => uint256) public shares;

    // This function is called in the callback of the attacker contract and is
    // executed because the shares of the attacker have not been set to 0 yet
    // by the withdraw function.
    function transfer(address to, uint256 amount) public {
        require(shares[msg.sender] >= amount);
        shares[msg.sender] -= amount;
        shares[to] += amount;
    }

    // Vulnerable to reentrancy attack, because it calls an external contract
    // before implementing the effects of the function.
    function withdraw() public {
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        if (success) {
            shares[msg.sender] = 0;
        }
    }

    function deposit() public payable {
        shares[msg.sender] += msg.value;
    }
```

In this example, the attacker contract would:

1. Deposit some ETH into the target contract.
2. Call the withdraw function of the target contract.
3. In the callback, call the transfer function of the target contract and transfer all the shares of the attacker to another wallet controlled by the attacker.
4. The withdraw function would then set the shares of the attacker to 0, but the attacker would have already transferred all their shares to another wallet.
5. From the attacker's wallet, the attacker would call the withdraw function again and withdraw again the same amount of ETH, draining the contract.

## Read Only Reentrancy

Read only reentrancy is similar in the sense that it has the same root cause: calling an external contract before implementing the effects of the function. The difference is that instead of re-entering the contract that does the callback, the attacker contract calls another contract that only reads the state of that contract and exploits the fact that the state effects of the function have not been finalized yet.

### POC

-   Contracts: [ReadOnlyReentrancy.sol](contracts/ReadOnlyReentrancy.sol)
-   Test: `yarn hardhat test test/readOnlyReentrancy.ts`

### Solutions:

At this point I think you've guessed it, the solution is the exact same one: follow the `Checks-Effects-Interactions` pattern. Please see the example below and in the [PoC](contracts/ReadOnlyReentrancy.sol):

```solidity
    mapping(address => uint256) public shares;

    function withdraw() public {
        // Interactions
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        // Effects
        if (success) {
            shares[msg.sender] = 0;
        }
    }
```

And here is the correct implementation of the `withdraw` function, following the pattern:

```solidity
    mapping(address => uint256) public shares;

    function withdraw() public {
        // Effects
        uint256 amount = shares[msg.sender];
        shares[msg.sender] = 0;
        // Interactions
        (bool success,) = msg.sender.call{value: amount}("");
    }
```

## OpenZeppelin ERC721 Reentrancy

[OpenZeppelin](openzeppelin.com) is one of the most used library of Smart Contracts, but used without respecting the `Checks-Effects-Interactions` pattern, it can create ERC721 contracts that are vulnerable to reentrancy attacks on minting tokens.

The [ERC721.sol](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.1/contracts/token/ERC721/ERC721.sol) contract of OpenZeppelin has some functions implemented that do callbacks to Smart Contracts to see if they have a way to manage NFTs, with the goal of not getting NFTs stuck in contracts. These functions are: `safeTransferFrom` and `_safeMint`.

```solidity
    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            // The actual private function doing the callback:
            _checkOnERC721Received(address(0), to, tokenId, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            // The callback to the contract is done here:
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                ...
```

The vulnerability can then appear when in the minting function of a NFT Collection the `_safeMint` function is used intead of the `_mint` one and the `Checks-Effects-Interactions` pattern is not followed.

### POC

-   Contracts: [ERC721Reentrancy.sol](contracts/ERC721Reentrancy.sol)
-   Test: `yarn hardhat test test/erc721Reentrancy.ts`

### Solutions:

As always with the Reentrancy Vulnerabilities, the solution is to follow the `Checks-Effects-Interactions` pattern. Please see the example below and in the [PoC](contracts/ERC721Reentrancy.sol):

```solidity
    // Wrong!
    function mint(uint256 tokenId) public {
        // Checks
        require(!hasMinted[msg.sender], "This address has already minted a token");
        // Interactions
        _safeMint(msg.sender, tokenId);
        // Effects
        hasMinted[msg.sender] = true;
    }

    // Correct!
    function mint(uint256 tokenId) public {
        // Checks
        require(!hasMinted[msg.sender], "This address has already minted a token");
        // Effects
        hasMinted[msg.sender] = true;
        // Interactions
        _safeMint(msg.sender, tokenId);
    }
```

# Forcefuly send ETH to a contract

It is possible to send ETH to a contract even if it does not have a `receive` or `fallback` function. This is done by calling the `selfdestruct` function on a attacker contract which will send all its ETH to the target contract.

### POC

-   Contracts: [ForceSend.sol](contracts/ForceSend.sol)
-   Test: `yarn hardhat test test/forceSend.ts`

In the following Game example, the contract logic depends on ETH being sent only in amounts on 1 ETH, so sending any other amount would break the game logic.

```solidity
contract ForceSendVulnerable {
    uint256 public targetAmount = 7 ether;
    address public winner;

    // Anyone can deposit 1 Ether and the 7th person to deposit wins all Ether.
    function deposit() public payable {
        require(msg.value == 1 ether, "You can only send 1 Ether");

        uint256 balance = address(this).balance;
        require(balance <= targetAmount, "Game is over");

        // Logic strictly depends on the ETH balance of the contract.
        if (balance == targetAmount) {
            winner = msg.sender;
        }
    }

    function claimReward() public {
        require(msg.sender == winner, "Not winner");

        (bool sent,) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }
}
```

### Solutions:

Instead of relying on `address(this).balance` to check the balance of the contract, the contract should use a variable to keep track of the ETH deposited by the players.

```solidity
contract ForceSendSafe {
    uint256 public targetAmount = 7 ether;
    uint256 public totalDeposited;
    address public winner;

    // Anyone can deposit 1 Ether and the 7th person to deposit wins all Ether.
    function deposit() public payable {
        require(msg.value == 1 ether, "You can only send 1 Ether");
        totalDeposited += msg.value;

        require(totalDeposited <= targetAmount, "Game is over");

        // Logic strictly depends on the ETH balance of the contract.
        if (totalDeposited == targetAmount) {
            winner = msg.sender;
        }
    }

    function claimReward() public {
        require(msg.sender == winner, "Not winner");

        (bool sent,) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }
}
```

# Accessing Private State Variables

While private state variables are not accessible from outside the contract, this is true only for other contracts. The blockchain is a fully transparent database and anyone can read the state of all contracts.

### POC

-   Contracts: [PrivateState.sol](contracts/PrivateState.sol)
-   Test: `yarn hardhat test test/privateState.ts`

### Solutions:

No sensitive data should ever be stored on the blockchain. If you need to store sensitive data, you should use a private database and only store the hash of the data on the blockchain to later prove the authenticity of the data.

# Insecure Source of Randomness

Since Blockchain is a deterministic system, it is not possible to generate random numbers on-chain. As this is an important feature for many applications, a lot of people try using hashes values such as `block.timestamp` or `block.difficulty` to generate random numbers. However, these values are not random and can be manipulated by validators or simply guessed by an attacker.

### POC

-   Contracts: [InsecureRandomness.sol](contracts/InsecureRandomness.sol)
-   Test: `yarn test test/insecureRandomness.ts`

See how in the PoC, the function `guess`in the vulnerable contract seems hard to guess by having to guess the `block.timestamp` and `blockhash` of the last block, but by simply recreating the same logic in the attacker contract, it is possible to guess the number.

```solidity
// Guess the correct number to win the entire contract's balance.
    function guess(uint256 _guess) public {
        uint256 answer = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        if (_guess == answer) {
            (bool success,) = msg.sender.call{value: address(this).balance}("");
            require(success, "Transfer failed.");
        }
    }
```

### Solutions:

Use a Chainlink VRF oracle to generate random numbers on-chain. It will be a more expensive opperation, but I'll have verified randomness for your Smart Contract. See the [Chainlink VRF documentation](https://docs.chain.link/docs/chainlink-vrf/) for more information.

# Denial of Service

## Reject Ether transfer

This vulnerability comes from calls to unknown addresses(contracts). If the contract does not have a `receive` or `fallback` function and the transaction is reverted, this results in a denial of service for any user trying to use the function with this logic.

### POC

-   Contracts: [RejectEther.sol](contracts/RejectEther.sol)
-   Test: `yarn hardhat test test/rejectEther.ts`

Consider the following Auction contract used in the PoC, if a malicious actor sends a bit from a smart contract with no `receive` or `fallback` function, the transaction will be reverted and the malicious actor will be able to block the auction from receiving any more bids.

```solidity
contract RejectEtherVulnerable {
    address public highestBidder;
    uint256 public highestBid;

    function bid() public payable {
        // Reject new bids that are lower than the current highest bid.
        require(msg.value > highestBid, "Bid not high enough");

        // Refund the current highest bidder, if it exists.
        if (highestBidder != address(0)) {
            (bool refunded,) = highestBidder.call{value: highestBid}("");
            require(refunded, "Failed to refund previous bidder");
        }

        // Update the current highest bid.
        highestBidder = msg.sender;
        highestBid = msg.value;
    }
}
```

### Solutions:

Use the `Pull over Push` Smart Contract design pattern. Instead of sending the ETH to the contract, the user should call a function to withdraw the ETH from the contract. We'll use a mapping to keep track of the ETH balance of each user and add a `withdraw` function to allow users to get their bid refunded after it is overbid.

```solidity
contract RejectEtherSafe {
    address public highestBidder;
    uint256 public highestBid;
    mapping(address => uint256) public availableRefund;

    function bid() public payable {
        // Reject new bids that are lower than the current highest bid.
        require(msg.value > highestBid, "Bid not high enough");

        // Refund the current highest bidder, if it exists.
        if (highestBidder != address(0)) {
            availableRefund[highestBidder] += highestBid;
        }

        // Update the current highest bid.
        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    function withdraw() public {
        uint256 amount = availableRefund[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        availableRefund[msg.sender] = 0;

        (bool refunded,) = msg.sender.call{value: amount}("");
        require(refunded, "Failed to refund bidder");
    }
}
```

## DoS with Block Gas Limit

Each Ethereum block has a gas limit, which is the maximum amount of gas that can be spent in the block. If a transaction requires more gas than the block gas limit, the transaction will be reverted. This can be used by an attacker to block a contract from being used by sending a transaction that requires more gas than the block gas limit.

It is very similar to the previous DoS vulnerability, but can apply to cases where the succes call to the unknown contract is not required. You'll see in the PoC how the attacker for the previous vulnerability does not work on the vulnerable contract and how the new attacker will work.

### POC

-   Contracts: [BlockGasLimit.sol](contracts/BlockGasLimit.sol)
-   Test: `yarn test test/blockGasLimit.ts`

In the code of the PoC we can see that we don't have any revert in case the call to the unknown contract fails, so not having a `receive` or `fallback` function will not prevent the contract from being used. However, if the implementation of the `fallback` function is too expensive, like a infinite loop that will run out of gas, the contract will be blocked from being used.

### Solutions:

Same as with the previous DoS vulnerability, try avoiding making calls to unknown contract, but if you have to, implement the `Pull over Push` Smart Contract design pattern.

# Phishing with tx.origin

The `tx.origin` variable is used to get the address of the sender of the transaction which can only be a EOA(externally owned address). This variable is not the same as `msg.sender` which is the address of the EOA/contract that called the function. This can be used by an attacker to trick users into thinking that a transaction is coming from a trusted contract.

### POC

-   Contracts: [PhishingTxOrigin.sol](contracts/PhishingTxOrigin.sol)
-   Test: `yarn hardhat test test/phishingTxOrigin.ts`

In the PoC, the attacker contract will bait the owner of the vulnerable contract to call it's `winFreeMoney()` function and in the function logic will call the vulnerable contract's `transferOwnership()` function. The vulnerable contract won't care who called the function as long as the transaction was initiated by the owner of the contract, which is the case here, so the attacker will be able to take ownership of the vulnerable contract.

```solidity
contract PhishingTxOriginVulnerable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address _newOwner) public {
        require(tx.origin == owner, "Not owner");
        owner = _newOwner;
    }
}

contract PhishingTxOriginAttacker {
    PhishingTxOriginVulnerable vulnerable;

    constructor(PhishingTxOriginVulnerable _vulnerable) {
        vulnerable = _vulnerable;
    }

    /////////////////////////////////////
    // Call this function for free ETH //
    /////////////////////////////////////
    function winFreeMoney() public {
        vulnerable.transferOwnership(address(this));
    }
}
```

### Solutions:

Use `msg.sender` instead of `tx.origin` to check if the transaction was initiated by the owner of the contract. It's almost never recommended to use `tx.origin` in your Smart Contracts, besides maybe for logging purposes or in comparison with `msg.sender` to check if the transaction is directlly coming from an EOA or from a contract, like:

```solidity
if (tx.origin == msg.sender) {
    // Transaction is coming from an EOA
} else {
    // Transaction is coming from a contract
}
```

# Front Running

Front running is one of the more diverse attacks in the Smart Contract space and can be used in many different ways. The general idea is that a malicious actor will try to get a transaction mined before a transaction that they know will be mined. This can be used to get a better price on a trade, to get a better price on a token sale, to get a better price on a bid, etc.

The flow of a front running attack is as follows:

1. The attacker monitors the mempool for transactions that they can front run to make a profit.
2. A user sends a transaction to the transaction pool from which the validator will pick transactions to include in the next block.
3. The attacker identifies the transaction that they want to front run and sends a transaction with a higher gas price to the transaction pool that can:
    - Include the same logic as the transaction that they want to front run, with a higher gas price, so they can get the same result as the user, claiming the profit for themselves.
    - Include logic that will make the transaction that they want to front run fail.
    - Include logic that will make the transaction that they want to front run lose money and create a opportunity for the attacker to make a profit.
4. Due to the higher gas price, the attacker's transaction will be picked by the validator to be included in the next block, instead of the user's transaction.
5. The attacker's transaction is mined before the user's transaction, so the attacker can get the result that they want.

### POC

-   Contracts: [FrontRunning.sol](contracts/FrontRunning.sol)

In the PoC, the attacker will monitor the mempool for transactions that call the vulnerable contract's `claimPrize()` function. When the attacker sees a transaction that calls the `claimPrize()` function with the corect password, they will send a transaction with a higher gas price that will call the vulnerable contract's `claimPrize()` function with the same parameter and transfer the funds to the attacker's address.

```solidity
contract FrontRunningVulnerable {
    address public winner;
    bytes32 public passwordHash;

    // The deployer of the contract sets a password hash and some Ether to be claimed.
    constructor(bytes32 _passwordHash) payable {
        passwordHash = _passwordHash;
    }

    // The winner can claim their prize by providing the password as a string
    // that has to be hashed to the password hash to verify it.
    function claimPrize(string memory _password) public {
        require(keccak256(abi.encodePacked(_password)) == passwordHash, "Wrong password");
        winner = msg.sender;
        (bool sc,) = msg.sender.call{value: address(this).balance}("");
        require(sc, "Failed to send Ether");
    }
}
```

### Solutions:

Front-running is a pervasive issue on public blockchains such as Ethereum. The best remediation is to remove the benefit of front-running in your application, mainly by removing the importance of transaction ordering or time. Another way is to use a pre-commit scheme (“I’m going to submit the details later”).

Protocol-level solutions such as [Flashbots](https://docs.flashbots.net/flashbots-auction/searchers/advanced/rpc-endpoints/) or [Submarine Commits](https://libsubmarine.org/) are also being developed or user to mitigate the issue.

# Block timestamp manipulation

Be aware that the timestamp of the block can be manipulated by the validator, and all direct and indirect uses of the timestamp should be considered. It should also go without saying that the timestamp of the block should never be used for producing randomness, as it can be manipulated.

The rule to keep in mind when using `block.timestamp` is called `The 15-second rule` and it comes from the fact that the timestamp of the block can be manipulated by the validator, but considering that the Ethereum Yellow Paper states that each blocks timestamp should be bigger than it's parent block timestamp, the validator can only manipulate the timestamp of the block by a maximum of 15 seconds. So remeber:

> If your logic depends on a precision of 15 seconds or less for the use of `block.timestamp`, your contract is vulnerable to manipulation.

### POC

Consider this Smart Contract game where the user can call the `spin()` function and if the block timestamp is divisible by 7, the user wins the game and gets all the Ether in the contract.

```solidity
contract TimestampManipulationVulnerable {

    function spin() public payable {
        require(msg.value == 1 ether, "Must send 1 Ether");

        require(block.timestamp % 7 == 0, "Must be divisible by 7");

        (bool sc,) = msg.sender.call{value: address(this).balance}("");
        require(sc, "Failed to send Ether");
    }
}
```

The normal chance to win this game is 1 out of 7, but The validator could be able to manipulate the timestamp of the block to make it divisible by 7 and win the game.

# Signature replay attack

A signature replay attack is when a malicious actor uses a signature that was signed to allow for a specific action to replay that action over and over again. This can be used to drain funds from a contract, to impersonate a user, etc.

This attack can happen in 3 cases:

1. User reuses the signed message in the same contract.
2. User reuses the signed message in a different contract with the same code, but a different address.

### POC

-   Contracts: [SignatureReplay.sol](contracts/SignatureReplay.sol)
-   Tests: `yarn hardhat test test/signatureReplay.ts`

In the PoC, the user will sign a message from user A of a Safe contract to allow the user B to withdraw 1 Ether from the MultiSig contract. The attacker will then replay the signature to withdraw 1 Ether from the Safe contract.

```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignatureReplayVulnerable {
    using ECDSA for bytes32;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {}

    // Transfer funds from this contract with a signature from the owner
    function transfer(address _to, uint256 _amount, bytes memory _signature) external {
        // Get the hash of the transaction
        bytes32 txHash = getTxHash(_to, _amount);
        // Check that the signature is valid for these specific parameters
        require(_checkSig(_signature, txHash), "Invalid signature");

        // Transfer the funds
        (bool sc,) = _to.call{value: _amount}("");
        require(sc, "Failed to send Ether");
    }

    // Compute the hash of the transaction parameters
    function getTxHash(address _to, uint256 _amount) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), _to, _amount));
    }

    // Check that the signature is valid for these specific parameters and signed by the owner
    function _checkSig(bytes memory _sig, bytes32 _txHash) internal view returns (bool) {
        bytes32 ethSignedHash = _txHash.toEthSignedMessageHash();

        address signer = ethSignedHash.recover(_sig);
        return signer == owner;
    }
}
```

### Solutions:

1. For the first case, we can add a nonce to the signed message to prevent the user from reusing the same signed message. So the message will be composed of the address `_to`, the amount `_amount`, and the nonce `_nonce`. The nonce can be a simple counter that is incremented every time the user signs a message and so no signed message can be reused.
2. For the second case, we can add the address of the contract to the signed message to prevent the user from reusing the same signed message in a different contract, so the message will be composed of the address `_to`, the amount `_amount`, the nonce `_nonce`, and the address of the contract which we can get from `address(this)` to verify.

# Contract with Zero Code Size

A common pattern used by Solidity Developers to check if a address is a EOA(externally owned address) or a Smart Contract is to check the code size of the address. They assume that if the code size is 0, the address is a EOA, and if the code size is greater than 0, the address is a Smart Contract.

This is a bad practice because the `extcodesize` opcode returns the code size of the runtime code, so if we call the `extcodesize` while the constructor is still running, the code size will be 0, because the runtime code is not deployed yet.

### POC

-   Contracts: [ZeroCodeSize.sol](contracts/ZeroCodeSize.sol)
-   Tests: `yarn hardhat test test/zeroCodeSize.ts`

Consider the following Smart Contract where the accessed variable can only be set to true by a EOA, but the attacker can call the `access()` function from a Smart Contract because the function is called in the constructor of the attacker contract.

```solidity
contract ZeroCodeSizeVulnerable {
    bool public accessed;

    function isContract(address _addr) public view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    function access() public {
        require(!isContract(msg.sender), "Only EOA");
        accessed = true;
    }
}

contract ZeroCodeSizeAttacker {
    constructor(ZeroCodeSizeVulnerable _victim_) {
        _victim_.access();
    }
}
```

### Solutions:

The solution in this kind of situation is to avoid using this pattern at all. It was even removed from the [OpenZeppelin Address](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Address.sol) library in a recent new version, for this very reason.
