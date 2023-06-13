# Learn about Solidity Hacks and Vulnerabilities

# Reentrancy

In Solidity, the reentrancy vulnerability is a type of security vulnerability where a function can be recursively called before its first invocation is finished, allowing an attacker to potentially change the state of the contract in unexpected ways. As the name of the hack suggests, this vulnerability is often exploited by calling back into the vulnerable contract, reentering the same function that is currently being executed and modifying the state of the contract before the first invocation is finished.

## POC

-   Contracts: [Reentrancy.sol](contracts/Reentrancy.sol)
-   Test: `yarn test test/reentrancy.ts`

#### The DAO Hack

The DAO hack is one of the most famous hacks in the history of Ethereum. The DAO was a decentralized autonomous organization that was created to act as a venture capital fund for the crypto and decentralized space. It was the victim of a reentrancy attack that allowed the attacker to drain 3.6 million ether from the DAO. The attacker was able to drain the funds by recursively calling the withdraw function of the DAO contract before the first invocation was finished and so their balance was not updated with each withdrawal, only the final one on the first invocation finish. It led to a hard fork of the Ethereum blockchain and the creation of Ethereum Classic.

Read more about it [here](https://medium.com/swlh/the-story-of-the-dao-its-history-and-consequences-71e6a8a551ee).

## Solutions:

-   Use the Checks-Effects-Interactions pattern, to ensure that all code paths through a contract complete all required checks of the supplied parameters before modifying the contract’s state (Checks); only then it makes any changes to the state (Effects); it may make calls to functions in other contracts after all planned state changes have been written to storage (Interactions). This is a common foolproof way to prevent reentrancy attacks, where an externally called malicious contract can double-spend an allowance, double-withdraw a balance, among other things, by using logic that calls back into the original contract before it has finalized its transaction.

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

    // Checks-Effects-Interactions pattern
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

-   Use Reentrancy Guards like the OpenZeppelin ReentrancyGuard.sol contract. This contract implements a nonReentrant modifier that can be used to prevent reentrancy attacks. It is important to note that this contract only protects external function calls, and that external calls to nonReentrant functions are still vulnerable to reentrancy attacks. To protect against this, you can use the nonReentrant modifier in the function that calls the internal function. This solution is not the optimal one, since it costs more gas for adding

```
    // Mapping of ether shares of the contract.
    mapping(address => uint) shares;
    // bool representing whether function is currently being executed.
    bool entered = false;

    // Reentrancy Guard sets entered to true before executing the function and sets it to false after the function is finished.
    // so if the function is called again before it is finished, it will revert.
    modifier nonReentrant() {
        require(!entered);
        entered = true;
        _;
        entered = false;
    }

    // Would be vulnerable to reentrancy attack, because it calls an external contract before implementing the effects of the function
    // in the body, but the nonReentrant modifier prevents this.
    function withdraw() public nonReentrant {
        require(shares[msg.sender] > 0);
        (bool success,) = msg.sender.call{value: shares[msg.sender]}("");
        if (success)
            shares[msg.sender] = 0;
    }
```
