// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ActionVote.sol";

contract DeployActionVote is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new ActionVote();
    }
}
