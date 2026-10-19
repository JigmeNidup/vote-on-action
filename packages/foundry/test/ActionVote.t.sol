// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/ActionVote.sol";

contract ActionVoteTest is Test {
    ActionVote public actionVote;

    address private owner = address(0xA11CE);
    address private memberOne = address(0x1);
    address private memberTwo = address(0x2);
    address private memberThree = address(0x3);
    address private outsider = address(0x4);

    function setUp() public {
        actionVote = new ActionVote();
    }

    function testAnyWalletCanCreateTeamAndBecomesOwner() public {
        uint256 teamId = _createTeam(owner, "Core Team");

        (uint256 id, address teamOwner, string memory name, uint256 memberCount,) = actionVote.teams(teamId);

        assertEq(id, 1);
        assertEq(teamOwner, owner);
        assertEq(name, "Core Team");
        assertEq(memberCount, 1);
        assertTrue(actionVote.isTeamMember(teamId, owner));
        assertEq(actionVote.teamMemberAt(teamId, 0), owner);
    }

    function testOnlyOwnerCanAddTeamMember() public {
        uint256 teamId = _createTeam(owner, "Core Team");

        vm.prank(outsider);
        vm.expectRevert("Not team owner");
        actionVote.addTeamMember(teamId, memberOne);

        vm.prank(owner);
        actionVote.addTeamMember(teamId, memberOne);

        assertTrue(actionVote.isTeamMember(teamId, memberOne));
    }

    function testOnlyOwnerCanRemoveTeamMember() public {
        uint256 teamId = _createTeamWithMembers();

        vm.prank(outsider);
        vm.expectRevert("Not team owner");
        actionVote.removeTeamMember(teamId, memberOne);

        vm.prank(owner);
        actionVote.removeTeamMember(teamId, memberOne);

        assertFalse(actionVote.isTeamMember(teamId, memberOne));
        (,,, uint256 memberCount,) = actionVote.teams(teamId);
        assertEq(memberCount, 2);
    }

    function testOwnerCannotRemoveSelf() public {
        uint256 teamId = _createTeam(owner, "Core Team");

        vm.prank(owner);
        vm.expectRevert("Cannot remove owner");
        actionVote.removeTeamMember(teamId, owner);
    }

    function testRemovedMemberCannotCreateNewProposal() public {
        uint256 teamId = _createTeamWithMembers();

        vm.prank(owner);
        actionVote.removeTeamMember(teamId, memberOne);

        vm.prank(memberOne);
        vm.expectRevert("Not team member");
        actionVote.createProposal(teamId, "Budget", "Approve the launch budget");
    }

    function testTeamMemberCanCreateProposalWithSnapshot() public {
        uint256 teamId = _createTeamWithMembers();

        uint256 proposalId = _createProposal(teamId, memberOne);

        (uint256 id, uint256 proposalTeamId, address proposer, string memory title,,,,,,) =
            actionVote.proposals(proposalId);

        assertEq(id, 1);
        assertEq(proposalTeamId, teamId);
        assertEq(proposer, memberOne);
        assertEq(title, "Budget");
        assertEq(actionVote.proposalVoterCount(proposalId), 3);
        assertTrue(actionVote.isProposalVoter(proposalId, owner));
        assertTrue(actionVote.isProposalVoter(proposalId, memberOne));
        assertTrue(actionVote.isProposalVoter(proposalId, memberTwo));
    }

    function testAddedAfterProposalCannotVoteOnOldProposal() public {
        uint256 teamId = _createTeamWithMembers();
        uint256 proposalId = _createProposal(teamId, memberOne);

        vm.prank(owner);
        actionVote.addTeamMember(teamId, memberThree);

        assertTrue(actionVote.isTeamMember(teamId, memberThree));
        assertFalse(actionVote.isProposalVoter(proposalId, memberThree));

        vm.prank(memberThree);
        vm.expectRevert("Not proposal voter");
        actionVote.voteYes(proposalId);
    }

    function testRemovedAfterProposalCanStillVoteOnOldProposal() public {
        uint256 teamId = _createTeamWithMembers();
        uint256 proposalId = _createProposal(teamId, memberOne);

        vm.prank(owner);
        actionVote.removeTeamMember(teamId, memberTwo);

        assertFalse(actionVote.isTeamMember(teamId, memberTwo));
        assertTrue(actionVote.isProposalVoter(proposalId, memberTwo));

        vm.prank(memberTwo);
        actionVote.voteYes(proposalId);

        (,,,,, uint256 yesVotes,,,,) = actionVote.proposals(proposalId);
        assertEq(yesVotes, 1);
    }

    function testNoVoteRequiresSuggestion() public {
        uint256 proposalId = _createProposal(_createTeamWithMembers(), memberOne);

        vm.prank(memberTwo);
        vm.expectRevert("Suggestion required");
        actionVote.voteNo(proposalId, "");
    }

    function testVoterCanVoteNoWithSuggestion() public {
        uint256 proposalId = _createProposal(_createTeamWithMembers(), memberOne);

        vm.prank(memberTwo);
        actionVote.voteNo(proposalId, "Use a smaller pilot first");

        (,,,,, uint256 yesVotes, uint256 noVotes,,,) = actionVote.proposals(proposalId);
        (ActionVote.VoteChoice choice, string memory suggestion,) = actionVote.votes(proposalId, memberTwo);

        assertEq(yesVotes, 0);
        assertEq(noVotes, 1);
        assertEq(uint8(choice), uint8(ActionVote.VoteChoice.No));
        assertEq(suggestion, "Use a smaller pilot first");
    }

    function testVoterCannotVoteTwice() public {
        uint256 proposalId = _createProposal(_createTeamWithMembers(), memberOne);

        vm.startPrank(memberTwo);
        actionVote.voteYes(proposalId);
        vm.expectRevert("Already voted");
        actionVote.voteNo(proposalId, "Changed my mind");
        vm.stopPrank();
    }

    function testProposerOrTeamOwnerCanCloseProposal() public {
        uint256 teamId = _createTeamWithMembers();
        uint256 firstProposalId = _createProposal(teamId, memberOne);
        uint256 secondProposalId = _createProposal(teamId, memberTwo);

        vm.prank(memberOne);
        actionVote.closeProposal(firstProposalId);

        vm.prank(owner);
        actionVote.closeProposal(secondProposalId);

        (,,,,,,, bool firstClosed,,) = actionVote.proposals(firstProposalId);
        (,,,,,,, bool secondClosed,,) = actionVote.proposals(secondProposalId);

        assertTrue(firstClosed);
        assertTrue(secondClosed);
    }

    function testOutsiderCannotCloseProposal() public {
        uint256 proposalId = _createProposal(_createTeamWithMembers(), memberOne);

        vm.prank(outsider);
        vm.expectRevert("Not authorized");
        actionVote.closeProposal(proposalId);
    }

    function testClosedProposalRejectsVotes() public {
        uint256 proposalId = _createProposal(_createTeamWithMembers(), memberOne);

        vm.prank(memberOne);
        actionVote.closeProposal(proposalId);

        vm.prank(memberTwo);
        vm.expectRevert("Proposal is closed");
        actionVote.voteYes(proposalId);
    }

    function _createTeam(address creator, string memory name) private returns (uint256 teamId) {
        vm.prank(creator);
        teamId = actionVote.createTeam(name);
    }

    function _createTeamWithMembers() private returns (uint256 teamId) {
        teamId = _createTeam(owner, "Core Team");

        vm.startPrank(owner);
        actionVote.addTeamMember(teamId, memberOne);
        actionVote.addTeamMember(teamId, memberTwo);
        vm.stopPrank();
    }

    function _createProposal(uint256 teamId, address proposer) private returns (uint256 proposalId) {
        vm.prank(proposer);
        proposalId = actionVote.createProposal(teamId, "Budget", "Approve the launch budget");
    }
}
