// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {OathsAndAshes} from "../src/OathsAndAshes.sol";

contract Deploy is Script {
    function run() external returns (OathsAndAshes) {
        vm.startBroadcast();
        OathsAndAshes game = new OathsAndAshes();
        vm.stopBroadcast();
        return game;
    }
}
