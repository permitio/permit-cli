import { Command } from "commander";
import chalk from "chalk";

export const graphCommand = new Command("graph")
  .description("Display Permit ReBAC relationship graph in terminal")
  .option("--format <type>", "Output format (tree|json)", "tree")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n🌳 Permit ReBAC Relationship Graph:"));
    console.log(`
User: admin
└── MemberOf ──> Organization: Acme Corp
    └── HasAccess ──> Workspace: Production
        ├── ReadPermission  ──> Document: *
        └── WritePermission ──> Document: [Drafts]
`);
  });
