#!/usr/bin/env node

/**
 * GoldMail Email Validation CLI
 * Command-line interface for validating emails using the GoldMail API
 */

import { GoldMailClient } from './client';

interface CliOptions {
  apiKey: string;
  baseUrl?: string;
  verbose?: boolean;
}

const VERSION = '1.0.0';

const HELP_TEXT = `
GoldMail Email Validation CLI v${VERSION}

USAGE:
  goldmail <command> [options] [arguments]

COMMANDS:
  validate <email>       Validate a single email address
  validate-ai <email>    Validate with AI-powered analysis
  bulk <file>            Validate emails from a file (one per line)
  job <job-id>           Check status of a bulk validation job
  credits                Check your credit balance
  health                 Check API health status

OPTIONS:
  -k, --api-key <key>    API key (or set GOLDMAIL_API_KEY env var)
  -u, --base-url <url>   Custom API base URL
  -v, --verbose          Verbose output with full details
  -o, --output <file>    Output results to file (JSON format)
  -f, --format <format>  Output format: json, table, csv (default: table)
  -h, --help             Show this help message
  --version              Show version number

EXAMPLES:
  goldmail validate user@example.com
  goldmail validate-ai user@example.com -v
  goldmail bulk emails.txt -o results.json
  goldmail credits -k your_api_key
  GOLDMAIL_API_KEY=your_key goldmail health

ENVIRONMENT VARIABLES:
  GOLDMAIL_API_KEY       Your GoldMail API key
  GOLDMAIL_BASE_URL      Custom API base URL (optional)
`;

function parseArgs(args: string[]): {
  command: string;
  args: string[];
  options: Record<string, string | boolean>;
} {
  const options: Record<string, string | boolean> = {};
  const positionalArgs: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key === 'help' || key === 'version' || key === 'verbose') {
        options[key] = true;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[++i];
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const shortMap: Record<string, string> = {
        k: 'api-key',
        u: 'base-url',
        v: 'verbose',
        o: 'output',
        f: 'format',
        h: 'help',
      };
      const fullKey = shortMap[key] || key;
      if (fullKey === 'help' || fullKey === 'verbose') {
        options[fullKey] = true;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[fullKey] = args[++i];
      }
    } else if (!command) {
      command = arg;
    } else {
      positionalArgs.push(arg);
    }
  }

  return { command, args: positionalArgs, options };
}

function formatTable(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));

  for (const [key, value] of Object.entries(data)) {
    const formattedValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    lines.push(`${key.padEnd(maxKeyLength + 2)}: ${formattedValue}`);
  }

  return lines.join('\n');
}

function formatCsv(data: Record<string, unknown>): string {
  const headers = Object.keys(data).join(',');
  const values = Object.values(data)
    .map((v) => {
      const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return str.includes(',') ? `"${str}"` : str;
    })
    .join(',');
  return `${headers}\n${values}`;
}

function output(
  data: unknown,
  format: string = 'table',
  verbose: boolean = false
): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === 'csv' && typeof data === 'object' && data !== null) {
    console.log(formatCsv(data as Record<string, unknown>));
  } else if (typeof data === 'object' && data !== null) {
    if (verbose) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(formatTable(data as Record<string, unknown>));
    }
  } else {
    console.log(data);
  }
}

async function writeOutput(filePath: string, data: unknown): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`Results written to ${filePath}`);
}

async function readEmailsFromFile(filePath: string): Promise<string[]> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.includes('@'));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, args: positionalArgs, options } = parseArgs(args);

  // Handle help and version
  if (options.help || command === 'help') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (options.version) {
    console.log(`GoldMail CLI v${VERSION}`);
    process.exit(0);
  }

  // Get API key
  const apiKey =
    (options['api-key'] as string) || process.env.GOLDMAIL_API_KEY;
  if (!apiKey && !['help', 'version', ''].includes(command)) {
    console.error(
      'Error: API key required. Use -k/--api-key or set GOLDMAIL_API_KEY environment variable.'
    );
    process.exit(1);
  }

  // Initialize client
  const client = new GoldMailClient(apiKey || '', {
    baseUrl: (options['base-url'] as string) || process.env.GOLDMAIL_BASE_URL,
  });

  const format = (options.format as string) || 'table';
  const verbose = options.verbose as boolean;
  const outputFile = options.output as string;

  try {
    let result: unknown;

    switch (command) {
      case 'validate': {
        if (!positionalArgs[0]) {
          console.error('Error: Email address required.');
          console.error('Usage: goldmail validate <email>');
          process.exit(1);
        }
        console.log(`Validating: ${positionalArgs[0]}...`);
        result = await client.validate(positionalArgs[0]);
        break;
      }

      case 'validate-ai': {
        if (!positionalArgs[0]) {
          console.error('Error: Email address required.');
          console.error('Usage: goldmail validate-ai <email>');
          process.exit(1);
        }
        console.log(`Validating with AI: ${positionalArgs[0]}...`);
        result = await client.validateAI(positionalArgs[0]);
        break;
      }

      case 'bulk': {
        if (!positionalArgs[0]) {
          console.error('Error: File path required.');
          console.error('Usage: goldmail bulk <file>');
          process.exit(1);
        }
        console.log(`Reading emails from: ${positionalArgs[0]}...`);
        const emails = await readEmailsFromFile(positionalArgs[0]);
        console.log(`Found ${emails.length} emails. Starting bulk validation...`);
        result = await client.validateBulk(emails);
        break;
      }

      case 'job': {
        if (!positionalArgs[0]) {
          console.error('Error: Job ID required.');
          console.error('Usage: goldmail job <job-id>');
          process.exit(1);
        }
        console.log(`Checking job status: ${positionalArgs[0]}...`);
        result = await client.getBulkJobStatus(positionalArgs[0]);
        break;
      }

      case 'credits': {
        console.log('Checking credit balance...');
        result = await client.getCredits();
        break;
      }

      case 'health': {
        console.log('Checking API health...');
        result = await client.health();
        break;
      }

      default: {
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        console.log(HELP_TEXT);
        process.exit(command ? 1 : 0);
      }
    }

    if (result !== undefined) {
      console.log('\n--- Result ---\n');
      output(result, format, verbose);

      if (outputFile) {
        await writeOutput(outputFile, result);
      }
    }
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    if (verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
