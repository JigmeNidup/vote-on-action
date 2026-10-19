"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ProposalSummaryCard } from "~~/app/_components/action-vote";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const ProposalsPage: NextPage = () => {
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
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
        <div>
          <h1 className="text-3xl font-semibold">Proposal history</h1>
          <p className="mt-2 text-base-content/70">
            Proposals connected to your wallet. Open a proposal to see the full record.
          </p>
        </div>
        {!connectedAddress ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            Connect your wallet to see your proposal history.
          </div>
        ) : proposalIds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/60">
            No proposals recorded yet.
          </div>
        ) : (
          <>
            {proposalIds.map(proposalId => (
              <ProposalSummaryCard
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
                No proposal history for this wallet.
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default ProposalsPage;
