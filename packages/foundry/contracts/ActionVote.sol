// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ActionVote {
    enum VoteChoice {
        None,
        Yes,
        No
    }

    struct Team {
        uint256 id;
        address owner;
        string name;
        uint256 memberCount;
        uint256 createdAt;
    }

    struct Proposal {
        uint256 id;
        uint256 teamId;
        address proposer;
        string title;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        bool closed;
        uint256 createdAt;
        uint256 closedAt;
    }

    struct Vote {
        VoteChoice choice;
        string suggestion;
        uint256 votedAt;
    }

    uint256 public teamCount;
    uint256 public proposalCount;

    mapping(uint256 teamId => Team team) public teams;
    mapping(uint256 teamId => mapping(address member => bool active)) private teamMembers;
    mapping(uint256 teamId => address[] members) private teamMemberList;
    mapping(uint256 proposalId => Proposal proposal) public proposals;
    mapping(uint256 proposalId => mapping(address voter => bool eligible)) private proposalEligibleVoters;
    mapping(uint256 proposalId => address[] voters) private proposalVoterList;
    mapping(uint256 proposalId => mapping(address voter => Vote vote)) public votes;

    event TeamCreated(uint256 indexed teamId, address indexed owner, string name);
    event TeamMemberAdded(uint256 indexed teamId, address indexed member);
    event TeamMemberRemoved(uint256 indexed teamId, address indexed member);
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed teamId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteChoice choice, string suggestion);
    event ProposalClosed(uint256 indexed proposalId, address indexed closedBy);

    modifier teamExists(uint256 teamId) {
        require(teamId > 0 && teamId <= teamCount, "Team does not exist");
        _;
    }

    modifier onlyTeamOwner(uint256 teamId) {
        require(teams[teamId].owner == msg.sender, "Not team owner");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        _;
    }

    function createTeam(string calldata name) external returns (uint256) {
        require(bytes(name).length > 0, "Team name required");

        teamCount++;

        teams[teamCount] =
            Team({ id: teamCount, owner: msg.sender, name: name, memberCount: 0, createdAt: block.timestamp });

        _addTeamMember(teamCount, msg.sender);

        emit TeamCreated(teamCount, msg.sender, name);

        return teamCount;
    }

    function addTeamMember(uint256 teamId, address member) external teamExists(teamId) onlyTeamOwner(teamId) {
        _addTeamMember(teamId, member);
    }

    function removeTeamMember(uint256 teamId, address member) external teamExists(teamId) onlyTeamOwner(teamId) {
        require(member != address(0), "Invalid member");
        require(member != teams[teamId].owner, "Cannot remove owner");
        require(teamMembers[teamId][member], "Not team member");

        teamMembers[teamId][member] = false;
        teams[teamId].memberCount--;

        emit TeamMemberRemoved(teamId, member);
    }

    function createProposal(uint256 teamId, string calldata title, string calldata description)
        external
        teamExists(teamId)
        returns (uint256)
    {
        require(teamMembers[teamId][msg.sender], "Not team member");
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");

        proposalCount++;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            teamId: teamId,
            proposer: msg.sender,
            title: title,
            description: description,
            yesVotes: 0,
            noVotes: 0,
            closed: false,
            createdAt: block.timestamp,
            closedAt: 0
        });

        address[] storage members = teamMemberList[teamId];
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            if (teamMembers[teamId][member]) {
                proposalEligibleVoters[proposalCount][member] = true;
                proposalVoterList[proposalCount].push(member);
            }
        }

        emit ProposalCreated(proposalCount, teamId, msg.sender, title);

        return proposalCount;
    }

    function voteYes(uint256 proposalId) external proposalExists(proposalId) {
        _vote(proposalId, VoteChoice.Yes, "");
    }

    function voteNo(uint256 proposalId, string calldata suggestion) external proposalExists(proposalId) {
        require(bytes(suggestion).length > 0, "Suggestion required");
        _vote(proposalId, VoteChoice.No, suggestion);
    }

    function closeProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        require(!proposal.closed, "Proposal already closed");
        require(msg.sender == proposal.proposer || msg.sender == teams[proposal.teamId].owner, "Not authorized");

        proposal.closed = true;
        proposal.closedAt = block.timestamp;

        emit ProposalClosed(proposalId, msg.sender);
    }

    function isTeamMember(uint256 teamId, address account) external view teamExists(teamId) returns (bool) {
        return teamMembers[teamId][account];
    }

    function teamMemberListLength(uint256 teamId) external view teamExists(teamId) returns (uint256) {
        return teamMemberList[teamId].length;
    }

    function teamMemberAt(uint256 teamId, uint256 index) external view teamExists(teamId) returns (address) {
        return teamMemberList[teamId][index];
    }

    function isProposalVoter(uint256 proposalId, address account)
        external
        view
        proposalExists(proposalId)
        returns (bool)
    {
        return proposalEligibleVoters[proposalId][account];
    }

    function proposalVoterCount(uint256 proposalId) external view proposalExists(proposalId) returns (uint256) {
        return proposalVoterList[proposalId].length;
    }

    function proposalVoterAt(uint256 proposalId, uint256 index)
        external
        view
        proposalExists(proposalId)
        returns (address)
    {
        return proposalVoterList[proposalId][index];
    }

    function hasVoted(uint256 proposalId, address voter) external view proposalExists(proposalId) returns (bool) {
        return votes[proposalId][voter].choice != VoteChoice.None;
    }

    function getTeam(uint256 teamId) external view teamExists(teamId) returns (Team memory) {
        return teams[teamId];
    }

    function getProposal(uint256 proposalId) external view proposalExists(proposalId) returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getVote(uint256 proposalId, address voter) external view proposalExists(proposalId) returns (Vote memory) {
        return votes[proposalId][voter];
    }

    function _addTeamMember(uint256 teamId, address member) private {
        require(member != address(0), "Invalid member");
        require(!teamMembers[teamId][member], "Already team member");

        teamMembers[teamId][member] = true;
        teamMemberList[teamId].push(member);
        teams[teamId].memberCount++;

        emit TeamMemberAdded(teamId, member);
    }

    function _vote(uint256 proposalId, VoteChoice choice, string memory suggestion) private {
        Proposal storage proposal = proposals[proposalId];
        Vote storage voterVote = votes[proposalId][msg.sender];

        require(!proposal.closed, "Proposal is closed");
        require(proposalEligibleVoters[proposalId][msg.sender], "Not proposal voter");
        require(voterVote.choice == VoteChoice.None, "Already voted");

        voterVote.choice = choice;
        voterVote.suggestion = suggestion;
        voterVote.votedAt = block.timestamp;

        if (choice == VoteChoice.Yes) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit VoteCast(proposalId, msg.sender, choice, suggestion);
    }
}
