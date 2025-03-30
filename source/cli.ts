#!/usr/bin/env -S deno run --allow-all

function printHelp() {
  console.log(`
Permit.io CLI v0.1.2

Usage:
  permit [command] [options]

Commands:
  pdp check    Check PDP status
  --help       Show this help message
  --version    Show version
`);
}

function main() {
  const args = Deno.args;
  
  if (args.includes("--version")) {
    console.log("permit-cli v0.1.2");
    return;
  }

  if (args.includes("--help")) {
    printHelp();
    return;
  }

  if (args[0] === "pdp" && args[1] === "check") {
    console.log("Checking PDP status...");
    return;
  }

  printHelp();
}

if (import.meta.main) {
  main();
} 