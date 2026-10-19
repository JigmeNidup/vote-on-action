# Vote on Action

Vote on Action is a Sepolia testnet dapp for recording team decisions on-chain. A wallet can create a team, manage the team's voters, create proposals for that team, and let eligible members vote with their connected wallet.

The project is built with Scaffold-ETH 2, Next.js, RainbowKit, Wagmi, Viem, TypeScript, Solidity, and Foundry.

## What It Does

- Create named teams from any connected wallet.
- Treat the team creator as the team owner.
- Let the team owner add or remove member wallet addresses.
- Create proposals under a selected team.
- Snapshot eligible voters when a proposal is created, so later team changes do not rewrite the voter list for older proposals.
- Let eligible voters cast one vote per proposal.
- Support `Yes` votes and `No` votes.
- Require a suggestion when a voter votes `No`, so alternate decisions are captured on-chain.
- Let the proposal creator or team owner close a proposal.
- Show active proposals, proposal history, proposal detail, vote totals, eligible voters, and recorded suggestions.

## App Pages

- `/` - Home page with active proposals.
- `/teams` - Team creation and member management.
- `/proposals/new` - Create a proposal for a selected team.
- `/proposals` - Proposal history.
- `/proposals/[proposalId]` - Proposal detail, voter snapshot, vote results, suggestions, and voting controls.
- `/debug` - Scaffold-ETH contract debug UI.

## Smart Contract

Main contract:

```text
packages/foundry/contracts/ActionVote.sol
```

Deployment script:

```text
packages/foundry/script/DeployActionVote.s.sol
```

Key contract concepts:

- `Team` stores the team id, owner, name, member count, and creation timestamp.
- `Proposal` stores the team id, proposer, title, description, vote counts, status, and timestamps.
- `Vote` stores the vote choice, optional suggestion, and vote timestamp.
- Team owners can add and remove members.
- Team owners cannot remove themselves.
- Only active team members can create proposals for that team.
- Only voters snapshotted at proposal creation can vote on that proposal.
- `voteNo` requires a non-empty suggestion.

## Network

The frontend is configured for Ethereum Sepolia:

```text
packages/nextjs/scaffold.config.ts
```

Current generated deployments include:

- Local Anvil `31337`: `0xb19b36b1456e65e3a6d514d3f715f204bd59f431`
- Sepolia `11155111`: `0x18a58066db405acbd25cc0e19564d7fa8f08fd7b`

Generated contract metadata is in:

```text
packages/nextjs/contracts/deployedContracts.ts
```

## Requirements

- Node.js `>= 20.18.3`
- Yarn
- Git
- Foundry toolchain
- A wallet funded with Sepolia ETH for testnet transactions

## Local Development

Install dependencies:

```bash
yarn install
```

Run a local Anvil chain:

```bash
yarn chain
```

Deploy the contract to the local chain:

```bash
yarn deploy
```

Start the frontend:

```bash
yarn start
```

Open:

```text
http://localhost:3000
```

## Sepolia Usage

The app targets Sepolia in `scaffold.config.ts`. To use the deployed Sepolia contract, connect a wallet on Sepolia and make sure it has Sepolia ETH for gas.

If you redeploy, run the deploy command with your configured deployer account and then commit the regenerated deployment artifacts and `packages/nextjs/contracts/deployedContracts.ts`.

## Testing and Checks

Run smart contract tests:

```bash
yarn foundry:test
```

Run Solidity lint:

```bash
yarn foundry:lint
```

Run frontend type checks:

```bash
yarn next:check-types
```

Run frontend lint:

```bash
yarn next:lint
```

Format the repo:

```bash
yarn format
```

## Project Structure

```text
packages/foundry/contracts/ActionVote.sol      Solidity contract
packages/foundry/test/ActionVote.t.sol         Foundry tests
packages/foundry/script/DeployActionVote.s.sol Deployment script
packages/nextjs/app/page.tsx                   Active proposals
packages/nextjs/app/teams/page.tsx             Teams and members
packages/nextjs/app/proposals/new/page.tsx     New proposal flow
packages/nextjs/app/proposals/page.tsx         Proposal history
packages/nextjs/app/proposals/[proposalId]     Proposal detail
packages/nextjs/app/_components/action-vote.tsx Shared proposal/team UI helpers
```
# vote-on-action
