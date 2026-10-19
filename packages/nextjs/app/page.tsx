"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { ProposalSummaryCard } from "~~/app/_components/action-vote";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address } = useAccount();
  const connectedAddress = address as `0x${string}` | undefined;
  const [proposalVisibility, setProposalVisibility] = useState<Record<string, boolean>>({});

  const { data: proposalCount } = useScaffoldReadContract({
    contractName: "ActionVote",
    functionName: "proposalCount",
  });

  const count = Number(proposalCount ?? 0n);
  const proposalIds = Array.from({ length: count }, (_, index) => BigInt(count - index));
  const resolvedProposalCount = Object.keys(proposalVisibility).length;
  const visibleProposalCount = Object.values(proposalVisibility).filter(Boolean).length;

  useEffect(() => {
    setProposalVisibility({});
  }, [connectedAddress, count]);

  return (
    <main className="min-h-screen bg-base-200">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Team-based Ethereum voting</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">Vote on Action</h1>
            <p className="mt-3 max-w-2xl text-base text-base-content/70">
              Active proposals from your teams, recorded on-chain with wallet-signed votes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/proposals/new">
              <PlusIcon className="h-5 w-5" />
              New proposal
            </Link>
            <Link className="btn btn-outline" href="/teams">
              <UserGroupIcon className="h-5 w-5" />
              Teams
            </Link>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active proposals</h2>
            <Link className="link text-sm" href="/proposals">
              Proposal history
            </Link>
          </div>
          {!connectedAddress ? (
            <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/60">
              Connect your wallet to see active proposals from your teams.
            </div>
          ) : proposalIds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/60">
              No proposals recorded yet.
            </div>
          ) : (
            <>
              {proposalIds.map(proposalId => (
                <ProposalSummaryCard
                  activeOnly
                  connectedAddress={connectedAddress}
                  key={proposalId.toString()}
                  proposalId={proposalId}
                  onVisibilityResolved={(id, visible) =>
                    setProposalVisibility(previous =>
                      previous[id.toString()] === visible ? previous : { ...previous, [id.toString()]: visible },
                    )
                  }
                />
              ))}
              {resolvedProposalCount === proposalIds.length && visibleProposalCount === 0 && (
                <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/60">
                  No active proposals for this wallet.
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
};

export default Home;
