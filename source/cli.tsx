#!/usr/bin/env node
import { Command } from 'commander';
import { buildGraphData } from './cli-commands/graph.js';

// console.log("Raw arguments:", process.argv);

const program = new Command();

program
  .name('permit')
  .description(`
    ██████╗ ███████╗███████╗███╗   ███╗██╗████████╗
    ██╔══██╗██╔════╝██╔════╝████╗ ████║██║╚══██╔══╝
    ██████╔╝█████╗  █████╗  ██╔████╔██║██║   ██║   
    ██╔═══╝ ██╔══╝  ██╔══╝  ██║╚██╔╝██║██║   ██║   
    ██║     ███████╗███████╗██║ ╚═╝ ██║██║   ██║   
    ╚═╝     ╚══════╝╚══════╝╚═╝     ╚═╝╚═╝   ╚═╝   
    Permit CLI - Command Line Interface
  `);

// Use a single word command `permit-fga-graph` instead of `permit fga graph`
program
  .command('permit-fga-graph')
  .description('Displays a graph of Permit permissions using ReBAC.')
  .requiredOption('--projid <string>', 'Project ID')
  .requiredOption('--envid <string>', 'Environment ID')
  .requiredOption('--token <string>', 'API authorization token')
  .option('--resourceId <string>', 'Resource ID (optional)')
  .action(async (options) => {
    console.log('Parsed options:', options);
    const { projid, envid, token } = options;
    console.log('Project ID:', projid);
    console.log('Environment ID:', envid);
    console.log('Token:', token);
    
    try {
      const graphData = await buildGraphData(projid, envid, token);
      console.log('Graph data:', JSON.stringify(graphData, null, 2));
    } catch (error) {
      console.error(`Failed to display graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });  

program.parse(process.argv);
