# Learn about Solidity Hacks and Vulnerabilities

# Reentrancy

In Solidity, the reentrancy vulnerability is a type of security vulnerability where a function can be recursively called before its first invocation is finished, allowing an attacker to potentially change the state of the contract in unexpected ways. As the name of the hack suggests, this vulnerability is often exploited by calling back into the vulnerable contract, reentering the same function that is currently being executed and modifying the state of the contract before the first invocation is finished.

## Single Function Reentrancy

### POC

-   Contracts: [Reentrancy.sol](contracts/Reentrancy.sol)
-   Test: `yarn test test/reentrancy.ts`

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
-   Test: `yarn test test/readOnlyReentrancy.ts`

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
-   Test: `yarn test test/erc721Reentrancy.ts`

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
