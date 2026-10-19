"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CheckIcon, LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  TeamName,
  asProposal,
  asTeam,
  asVote,
  formatTimestamp,
  getProposalFields,
  getTeamFields,
  voteLabel,
} from "~~/app/_components/action-vote";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const SnapshotVoter = ({ proposalId, voterIndex }: { proposalId: bigint; voterIndex: bigint }) => {
  const { targetNetwork } = useTargetNetwork();

  const { data: voter } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "proposalVoterAt",
    args: [proposalId, voterIndex],
  });

  const { data: rawVote } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getVote",
    args: [proposalId, voter],
    query: { enabled: Boolean(voter) },
  });

  if (!voter) return null;

  const vote = asVote(rawVote);
  const choice = vote?.choice ?? vote?.[0] ?? 0;
  const suggestion = vote?.suggestion ?? vote?.[1] ?? "";
  const votedAt = vote?.votedAt ?? vote?.[2] ?? 0n;

  return (
    <li className="rounded-md bg-base-200 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Address address={voter} chain={targetNetwork} />
        <div className="flex items-center gap-2">
          <span className={`badge ${choice === 1 ? "badge-success" : choice === 2 ? "badge-error" : "badge-outline"}`}>
            {voteLabel(choice)}
          </span>
          {votedAt > 0n && <span className="text-xs text-base-content/60">{formatTimestamp(votedAt)}</span>}
        </div>
      </div>
      {suggestion && <p className="mt-3 text-sm text-base-content/75">{suggestion}</p>}
    </li>
  );
};

const ProposalDetailPage: NextPage = () => {
  const params = useParams<{ proposalId: string }>();
  const proposalId = BigInt(params.proposalId);
  const { address } = useAccount();
  const connectedAddress = address as `0x${string}` | undefined;
  const { targetNetwork } = useTargetNetwork();
  const [suggestion, setSuggestion] = useState("");
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ActionVote" });

  const { data: rawProposal } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getProposal",
    args: [proposalId],
  });

  const proposal = asProposal(rawProposal);
  const { teamId, proposer, title, description, yesVotes, noVotes, closed, createdAt, closedAt } =
    getProposalFields(proposal);

  const { data: rawTeam } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getTeam",
    args: [teamId],
    query: { enabled: teamId !== undefined },
  });

  const { data: voterCount } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "proposalVoterCount",
    args: [proposalId],
    query: { enabled: Boolean(proposal) },
  });

  const { data: rawVote } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getVote",
    args: [proposalId, connectedAddress],
    query: { enabled: Boolean(proposal && connectedAddress) },
  });

  const { data: isProposalVoter } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isProposalVoter",
    args: [proposalId, connectedAddress],
    query: { enabled: Boolean(proposal && connectedAddress) },
  });

  const team = getTeamFields(asTeam(rawTeam));
  const vote = asVote(rawVote);
  const choice = vote?.choice ?? vote?.[0] ?? 0;
  const hasVoted = choice !== 0;
  const isProposer = Boolean(connectedAddress && proposer?.toLowerCase() === connectedAddress.toLowerCase());
  const canViewProposal = isProposer || Boolean(isProposalVoter);
  const canClose =
    connectedAddress?.toLowerCase() === proposer?.toLowerCase() ||
    connectedAddress?.toLowerCase() === team.owner?.toLowerCase();
  const voterIndexes = useMemo(() => {
    const count = Number(voterCount ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index));
  }, [voterCount]);

  const castYes = async () => {
    await writeContractAsync({ functionName: "voteYes", args: [proposalId] });
  };

  const castNo = async () => {
    await writeContractAsync(
      { functionName: "voteNo", args: [proposalId, suggestion.trim()] },
      {
        onBlockConfirmation: () => {
          setSuggestion("");
        },
      },
    );
  };

  const closeProposal = async () => {
    await writeContractAsync({ functionName: "closeProposal", args: [proposalId] });
  };

  if (!proposal) {
    return (
      <main className="min-h-screen bg-base-200">
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="rounded-lg border border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            Loading proposal...
          </div>
        </section>
      </main>
    );
  }

  if (!connectedAddress) {
    return (
      <main className="min-h-screen bg-base-200">
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="rounded-lg border border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            Connect your wallet to view this proposal.
          </div>
        </section>
      </main>
    );
  }

  if (!canViewProposal && isProposalVoter === undefined) {
    return (
      <main className="min-h-screen bg-base-200">
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="rounded-lg border border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            Checking proposal access...
          </div>
        </section>
      </main>
    );
  }

  if (!canViewProposal && isProposalVoter !== undefined) {
    return (
      <main className="min-h-screen bg-base-200">
        <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="rounded-lg border border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            This proposal is not available for the connected wallet.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-200">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
        <article className="rounded-lg border border-base-300 bg-base-100 p-8 shadow-sm md:p-10 lg:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold">{title}</h1>
                <span className={`badge ${closed ? "badge-neutral" : "badge-success"}`}>
                  {closed ? "Closed" : "Open"}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-base-content/75">{description}</p>
            </div>
            {canClose && !closed && (
              <button className="btn btn-outline btn-sm" disabled={isMining} onClick={closeProposal}>
                <LockClosedIcon className="h-4 w-4" />
                Close
              </button>
            )}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-md bg-base-200 p-4">
              <div className="text-sm text-base-content/60">Team</div>
              <div className="font-semibold">
                <TeamName teamId={teamId} />
              </div>
            </div>
            <div className="rounded-md bg-base-200 p-4">
              <div className="text-sm text-base-content/60">Creator</div>
              <Address address={proposer} chain={targetNetwork} />
            </div>
            <div className="rounded-md bg-base-200 p-4">
              <div className="text-sm text-base-content/60">Created</div>
              <div className="font-semibold">{formatTimestamp(createdAt)}</div>
            </div>
            <div className="rounded-md bg-success/10 p-4">
              <div className="text-sm text-base-content/60">Yes</div>
              <div className="text-2xl font-semibold">{yesVotes.toString()}</div>
            </div>
            <div className="rounded-md bg-error/10 p-4">
              <div className="text-sm text-base-content/60">No</div>
              <div className="text-2xl font-semibold">{noVotes.toString()}</div>
            </div>
            <div className="rounded-md bg-base-200 p-4">
              <div className="text-sm text-base-content/60">Closed</div>
              <div className="font-semibold">{closed ? formatTimestamp(closedAt) : "-"}</div>
            </div>
          </div>

          {!closed && !hasVoted && (
            <div className="mt-8 grid gap-3 lg:grid-cols-[auto_minmax(220px,1fr)_auto]">
              <button className="btn btn-success" disabled={isMining} onClick={castYes}>
                <CheckIcon className="h-5 w-5" />
                Vote Yes
              </button>
              <input
                className="input input-bordered w-full"
                placeholder="Alternative suggestion"
                value={suggestion}
                onChange={event => setSuggestion(event.target.value)}
              />
              <button className="btn btn-error" disabled={isMining || suggestion.trim().length === 0} onClick={castNo}>
                <XMarkIcon className="h-5 w-5" />
                Vote No
              </button>
            </div>
          )}

          {hasVoted && (
            <div className="mt-8 rounded-md bg-base-200 p-4 text-sm">
              <span className="font-medium">Your vote: {voteLabel(choice)}.</span>
            </div>
          )}
        </article>

        <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Snapshot voters</h2>
            <span className="badge badge-outline">{voterIndexes.length}</span>
          </div>
          <ul className="mt-4 grid gap-2">
            {voterIndexes.map(voterIndex => (
              <SnapshotVoter key={voterIndex.toString()} proposalId={proposalId} voterIndex={voterIndex} />
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
};

export default ProposalDetailPage;
