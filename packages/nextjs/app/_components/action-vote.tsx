"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

export type TeamTuple = readonly [bigint, `0x${string}`, string, bigint, bigint] & {
  id?: bigint;
  owner?: `0x${string}`;
  name?: string;
  memberCount?: bigint;
  createdAt?: bigint;
};

export type ProposalTuple = readonly [
  bigint,
  bigint,
  `0x${string}`,
  string,
  string,
  bigint,
  bigint,
  boolean,
  bigint,
  bigint,
] & {
  id?: bigint;
  teamId?: bigint;
  proposer?: `0x${string}`;
  title?: string;
  description?: string;
  yesVotes?: bigint;
  noVotes?: bigint;
  closed?: boolean;
  createdAt?: bigint;
  closedAt?: bigint;
};

export type VoteTuple = readonly [number, string, bigint] & {
  choice?: number;
  suggestion?: string;
  votedAt?: bigint;
};

export const asTeam = (team: unknown) => team as TeamTuple | undefined;
export const asProposal = (proposal: unknown) => proposal as ProposalTuple | undefined;
export const asVote = (vote: unknown) => vote as VoteTuple | undefined;

export const getTeamFields = (team?: TeamTuple) => ({
  id: team?.id ?? team?.[0],
  owner: team?.owner ?? team?.[1],
  name: team?.name ?? team?.[2],
  memberCount: team?.memberCount ?? team?.[3] ?? 0n,
  createdAt: team?.createdAt ?? team?.[4] ?? 0n,
});

export const getProposalFields = (proposal?: ProposalTuple) => ({
  id: proposal?.id ?? proposal?.[0],
  teamId: proposal?.teamId ?? proposal?.[1],
  proposer: proposal?.proposer ?? proposal?.[2],
  title: proposal?.title ?? proposal?.[3],
  description: proposal?.description ?? proposal?.[4],
  yesVotes: proposal?.yesVotes ?? proposal?.[5] ?? 0n,
  noVotes: proposal?.noVotes ?? proposal?.[6] ?? 0n,
  closed: proposal?.closed ?? proposal?.[7] ?? false,
  createdAt: proposal?.createdAt ?? proposal?.[8] ?? 0n,
  closedAt: proposal?.closedAt ?? proposal?.[9] ?? 0n,
});

export const voteLabel = (choice: number) => {
  if (choice === 1) return "Yes";
  if (choice === 2) return "No";
  return "Not voted";
};

export const formatTimestamp = (timestamp: bigint) => {
  if (timestamp === 0n) return "-";
  return new Date(Number(timestamp) * 1000).toLocaleString();
};

export const TeamName = ({ teamId }: { teamId?: bigint }) => {
  const { data: rawTeam } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getTeam",
    args: [teamId],
    query: { enabled: teamId !== undefined },
  });

  const { name } = getTeamFields(asTeam(rawTeam));

  return <>{name ?? `Team #${teamId?.toString() ?? "-"}`}</>;
};

export const ProposalVoterCount = ({ proposalId }: { proposalId: bigint }) => {
  const { data: voterCount } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "proposalVoterCount",
    args: [proposalId],
  });

  return <>{(voterCount ?? 0n).toString()}</>;
};

export const ProposalSummaryCard = ({
  proposalId,
  activeOnly = false,
  connectedAddress,
  onVisibilityResolved,
}: {
  proposalId: bigint;
  activeOnly?: boolean;
  connectedAddress?: `0x${string}`;
  onVisibilityResolved?: (proposalId: bigint, visible: boolean) => void;
}) => {
  const { targetNetwork } = useTargetNetwork();

  const { data: rawProposal } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getProposal",
    args: [proposalId],
  });

  const { data: isProposalVoter } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isProposalVoter",
    args: [proposalId, connectedAddress],
    query: { enabled: Boolean(connectedAddress) },
  });

  const proposal = asProposal(rawProposal);
  const { teamId, proposer, title, description, yesVotes, noVotes, closed, createdAt } = getProposalFields(proposal);
  const isProposer = Boolean(connectedAddress && proposer?.toLowerCase() === connectedAddress.toLowerCase());
  const canView = isProposer || Boolean(isProposalVoter);
  const accessResolved = Boolean(proposal && connectedAddress && (isProposer || isProposalVoter !== undefined));
  const shouldRender = Boolean(accessResolved && canView && !(activeOnly && closed));

  useEffect(() => {
    if (accessResolved) onVisibilityResolved?.(proposalId, shouldRender);
  }, [accessResolved, onVisibilityResolved, proposalId, shouldRender]);

  if (!shouldRender) return null;

  return (
    <Link
      className="block rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-primary/70"
      href={`/proposals/${proposalId.toString()}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold leading-tight">{title}</h2>
            <span className={`badge ${closed ? "badge-neutral" : "badge-success"}`}>{closed ? "Closed" : "Open"}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-base-content/70">{description}</p>
        </div>
        <div className="text-sm md:text-right">
          <div className="font-medium">
            <TeamName teamId={teamId} />
          </div>
          <div className="mt-1 text-xs text-base-content/60">{formatTimestamp(createdAt)}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-success/10 px-4 py-3">
          <div className="text-sm text-base-content/60">Yes</div>
          <div className="text-2xl font-semibold">{yesVotes.toString()}</div>
        </div>
        <div className="rounded-md bg-error/10 px-4 py-3">
          <div className="text-sm text-base-content/60">No</div>
          <div className="text-2xl font-semibold">{noVotes.toString()}</div>
        </div>
        <div className="rounded-md bg-base-200 px-4 py-3">
          <div className="text-sm text-base-content/60">Voters</div>
          <div className="text-2xl font-semibold">
            <ProposalVoterCount proposalId={proposalId} />
          </div>
        </div>
        <div className="rounded-md bg-base-200 px-4 py-3">
          <div className="text-sm text-base-content/60">Creator</div>
          <Address address={proposer} chain={targetNetwork} />
        </div>
      </div>
    </Link>
  );
};
