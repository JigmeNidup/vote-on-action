"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CheckCircleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { asTeam, getTeamFields } from "~~/app/_components/action-vote";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const TeamOption = ({
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
        <div className="font-semibold">{name}</div>
        {isSelected && (
          <span className="badge badge-primary gap-1">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            Selected
          </span>
        )}
      </div>
      <div className="mt-1 text-sm text-base-content/60">{memberCount.toString()} members</div>
    </button>
  );
};

const NewProposalPage: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const connectedAddress = address as `0x${string}` | undefined;
  const [selectedTeamId, setSelectedTeamId] = useState<bigint>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamVisibility, setTeamVisibility] = useState<Record<string, boolean>>({});
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ActionVote" });

  const { data: teamCount } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "teamCount",
  });

  const { data: isSelectedTeamMember } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "isTeamMember",
    args: [selectedTeamId, connectedAddress],
    query: { enabled: selectedTeamId !== undefined && Boolean(connectedAddress) },
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

  const canSubmit =
    Boolean(selectedTeamId && isSelectedTeamMember) &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !isMining;

  const createProposal = async () => {
    if (!selectedTeamId) return;

    await writeContractAsync(
      { functionName: "createProposal", args: [selectedTeamId, title.trim(), description.trim()] },
      {
        onBlockConfirmation: () => {
          router.push("/proposals");
        },
      },
    );
  };

  return (
    <main className="min-h-screen bg-base-200">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">Select team</h1>
          <div className="mt-4 grid gap-3">
            {!connectedAddress ? (
              <p className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                Connect your wallet to select a team.
              </p>
            ) : teamIds.length === 0 ? (
              <p className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                Create a team before starting a proposal.
              </p>
            ) : (
              <>
                {teamIds.map(teamId => (
                  <TeamOption
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
                  <p className="rounded-md border border-dashed border-base-300 p-4 text-sm text-base-content/60">
                    No teams for this wallet.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <form
          className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
          onSubmit={event => {
            event.preventDefault();
            if (canSubmit) void createProposal();
          }}
        >
          <h1 className="text-2xl font-semibold">Create proposal</h1>
          <div className="mt-5 flex flex-col gap-4">
            <input
              className="input input-bordered w-full"
              placeholder="Action title"
              value={title}
              onChange={event => setTitle(event.target.value)}
            />
            <textarea
              className="textarea textarea-bordered min-h-48 w-full"
              placeholder="Plan, decision, or action details"
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
            <button className="btn btn-primary self-start" disabled={!canSubmit} type="submit">
              <PlusIcon className="h-5 w-5" />
              Start proposal
            </button>
          </div>
          {selectedTeamId && connectedAddress && !isSelectedTeamMember && (
            <p className="mt-4 rounded-md bg-warning/15 p-3 text-sm text-base-content/75">
              This wallet is not a current member of the selected team.
            </p>
          )}
        </form>
      </section>
    </main>
  );
};

export default NewProposalPage;
