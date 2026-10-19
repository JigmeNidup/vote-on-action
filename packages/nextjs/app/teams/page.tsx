"use client";

import { useEffect, useMemo, useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { CheckCircleIcon, PlusIcon, UserMinusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { asTeam, getTeamFields } from "~~/app/_components/action-vote";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const TeamListItem = ({
  teamId,
  selectedTeamId,
  connectedAddress,
  onSelect,
  onVisibilityResolved,
}: {
  teamId: bigint;
  selectedTeamId?: bigint;
  connectedAddress?: `0x${string}`;
  onSelect: (teamId: bigint) => void;
  onVisibilityResolved?: (teamId: bigint, visible: boolean) => void;
}) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: rawTeam } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getTeam",
    args: [teamId],
  });

  const { data: isMember } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isTeamMember",
    args: [teamId, connectedAddress],
    query: { enabled: Boolean(connectedAddress) },
  });

  const { owner, name, memberCount } = getTeamFields(asTeam(rawTeam));
  const isSelected = selectedTeamId === teamId;
  const isOwner = Boolean(connectedAddress && owner?.toLowerCase() === connectedAddress.toLowerCase());
  const accessResolved = Boolean(rawTeam && connectedAddress && (isOwner || isMember !== undefined));
  const shouldRender = Boolean(accessResolved && (isOwner || isMember));

  useEffect(() => {
    if (accessResolved) onVisibilityResolved?.(teamId, shouldRender);
  }, [accessResolved, onVisibilityResolved, shouldRender, teamId]);

  if (!shouldRender) return null;

  return (
    <button
      className={`relative rounded-md border p-4 text-left transition ${
        isSelected
          ? "border-primary bg-primary/15 shadow-md shadow-primary/20 ring-2 ring-primary"
          : "border-base-300 bg-base-100 hover:border-primary/60 hover:bg-base-200"
      }`}
      onClick={() => onSelect(teamId)}
      type="button"
    >
      {isSelected && <div className="absolute inset-y-3 left-0 w-1 rounded-r bg-primary" />}
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{name}</span>
        <div className="flex items-center gap-2">
          {isSelected && (
            <span className="badge badge-primary gap-1">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Selected
            </span>
          )}
          <span className="badge badge-outline">{memberCount.toString()}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-base-content/60">Owner</div>
      <Address address={owner} chain={targetNetwork} />
    </button>
  );
};

const TeamMemberRow = ({ teamId, memberIndex, isOwner }: { teamId: bigint; memberIndex: bigint; isOwner: boolean }) => {
  const { targetNetwork } = useTargetNetwork();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ActionVote" });

  const { data: member } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "teamMemberAt",
    args: [teamId, memberIndex],
  });

  const { data: active } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isTeamMember",
    args: [teamId, member],
    query: { enabled: Boolean(member) },
  });

  if (!member || !active) return null;

  const removeMember = async () => {
    await writeContractAsync({ functionName: "removeTeamMember", args: [teamId, member] });
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-base-200 p-3">
      <Address address={member} chain={targetNetwork} />
      {isOwner && (
        <button className="btn btn-ghost btn-sm" disabled={isMining} onClick={removeMember} type="button">
          <UserMinusIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};

const TeamManager = ({ teamId, connectedAddress }: { teamId?: bigint; connectedAddress?: `0x${string}` }) => {
  const [memberAddress, setMemberAddress] = useState("");
  const { targetNetwork } = useTargetNetwork();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ActionVote" });

  const { data: rawTeam } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "getTeam",
    args: [teamId],
    query: { enabled: teamId !== undefined },
  });

  const { data: memberListLength } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "teamMemberListLength",
    args: [teamId],
    query: { enabled: teamId !== undefined },
  });

  const { data: isConnectedMember } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isTeamMember",
    args: [teamId, connectedAddress],
    query: { enabled: teamId !== undefined && Boolean(connectedAddress) },
  });

  const { owner, name, memberCount } = getTeamFields(asTeam(rawTeam));
  const memberIndexes = useMemo(() => {
    const count = Number(memberListLength ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index));
  }, [memberListLength]);
  const isOwner = Boolean(connectedAddress && owner?.toLowerCase() === connectedAddress.toLowerCase());
  const canViewTeam = isOwner || Boolean(isConnectedMember);
  const canAddMember = Boolean(teamId && isOwner && isAddress(memberAddress.trim()) && !isMining);

  const addMember = async () => {
    if (!teamId || !isAddress(memberAddress.trim())) return;

    await writeContractAsync(
      { functionName: "addTeamMember", args: [teamId, memberAddress.trim() as `0x${string}`] },
      {
        onBlockConfirmation: () => {
          setMemberAddress("");
        },
      },
    );
  };

  if (!teamId || !rawTeam || !connectedAddress || !canViewTeam) {
    return (
      <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Member management</h2>
        <p className="mt-4 text-sm text-base-content/60">Select one of your teams to view and manage members.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          <div className="mt-2 text-xs text-base-content/60">Owner</div>
          <Address address={owner} chain={targetNetwork} />
        </div>
        <span className="badge badge-outline">{memberCount.toString()} members</span>
      </div>

      {isOwner && (
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="input input-bordered w-full"
            placeholder="Member wallet address"
            value={memberAddress}
            onChange={event => setMemberAddress(event.target.value)}
          />
          <button className="btn btn-primary" disabled={!canAddMember} onClick={addMember} type="button">
            <UserPlusIcon className="h-5 w-5" />
            Add member
          </button>
        </div>
      )}

      {!isOwner && (
        <p className="mt-5 rounded-md bg-base-200 p-3 text-sm text-base-content/60">
          Only the team owner can add or remove members.
        </p>
      )}

      <ul className="mt-5 grid gap-2">
        {memberIndexes.map(memberIndex => (
          <TeamMemberRow key={memberIndex.toString()} isOwner={isOwner} memberIndex={memberIndex} teamId={teamId} />
        ))}
      </ul>
    </section>
  );
};

const TeamsPage: NextPage = () => {
  const { address } = useAccount();
  const connectedAddress = address as `0x${string}` | undefined;
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<bigint>();
  const [teamVisibility, setTeamVisibility] = useState<Record<string, boolean>>({});
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ActionVote" });

  const { data: teamCount } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "teamCount",
  });

  const teamIds = useMemo(() => {
    const count = Number(teamCount ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index + 1));
  }, [teamCount]);
  const resolvedTeamCount = Object.keys(teamVisibility).length;
  const visibleTeamCount = Object.values(teamVisibility).filter(Boolean).length;

  useEffect(() => {
    setTeamVisibility({});
  }, [connectedAddress, teamCount]);

  const createTeam = async () => {
    await writeContractAsync(
      { functionName: "createTeam", args: [teamName.trim()] },
      {
        onBlockConfirmation: () => {
          setTeamName("");
        },
      },
    );
  };

  return (
    <main className="min-h-screen bg-base-200">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-8 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <h1 className="text-2xl font-semibold">Teams</h1>
            <div className="mt-5 grid gap-2">
              <input
                className="input input-bordered w-full"
                placeholder="Team name"
                value={teamName}
                onChange={event => setTeamName(event.target.value)}
              />
              <button
                className="btn btn-primary"
                disabled={teamName.trim().length === 0 || isMining}
                onClick={createTeam}
              >
                <PlusIcon className="h-5 w-5" />
                Create team
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your team list</h2>
              <span className="badge badge-outline">{teamIds.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {!connectedAddress ? (
                <div className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                  Connect your wallet to see your teams.
                </div>
              ) : teamIds.length === 0 ? (
                <div className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                  No teams created yet.
                </div>
              ) : (
                <>
                  {teamIds.map(teamId => (
                    <TeamListItem
                      connectedAddress={connectedAddress}
                      key={teamId.toString()}
                      onSelect={setSelectedTeamId}
                      selectedTeamId={selectedTeamId}
                      teamId={teamId}
                      onVisibilityResolved={(id, visible) =>
                        setTeamVisibility(previous =>
                          previous[id.toString()] === visible ? previous : { ...previous, [id.toString()]: visible },
                        )
                      }
                    />
                  ))}
                  {resolvedTeamCount === teamIds.length && visibleTeamCount === 0 && (
                    <div className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                      No teams for this wallet.
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        <TeamManager connectedAddress={connectedAddress} teamId={selectedTeamId} />
      </section>
    </main>
  );
};

export default TeamsPage;
