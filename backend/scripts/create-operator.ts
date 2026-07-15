import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { PrismaClient, type OperatorRole } from "@prisma/client";
import { loadDotEnv } from "../src/env.js";
import { hashPassword } from "../src/auth/passwords.js";

/**
 * Create or update an operator console account (idempotent by email).
 *
 * Interactive (recommended — password prompted with hidden input, never typed
 * into the shell):
 *   npm run operator:create -- --email ana@spazio.example --name "Ana" [--role catalog_curator]
 *
 * Non-interactive: set OPERATOR_PASSWORD in the environment. Note an inline
 * assignment typed at a prompt (`OPERATOR_PASSWORD=... npm run ...`) is recorded
 * in shell history; load it from a hidden read instead:
 *   read -s OPERATOR_PASSWORD && export OPERATOR_PASSWORD
 *
 * Requires DATABASE_URL. Roles: catalog_curator | order_handler
 * (omit for all-purpose staff; per-action role gating per FEAT-011/015 —
 * render_reviewer retired with the render-review gate, ADR-025).
 */

const ROLES: readonly string[] = ["catalog_curator", "order_handler"];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  // A following flag means the value was omitted — treat as missing.
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

/** Prompt on the TTY with echo suppressed (output is swallowed while typing). */
async function promptHiddenPassword(): Promise<string> {
  const muted = new Writable({ write: (_chunk, _enc, done) => done() });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  process.stderr.write("Operator password (input hidden): ");
  const answer = await new Promise<string>((resolve) => rl.question("", resolve));
  rl.close();
  process.stderr.write("\n");
  return answer;
}

async function main(): Promise<void> {
  loadDotEnv();
  const email = argValue("--email");
  const name = argValue("--name");
  const roleArg = argValue("--role");

  if (!email || !name) {
    console.error(
      "Usage: npm run operator:create -- --email <email> --name <name> [--role <role>]\n" +
        "Password: prompted interactively, or set OPERATOR_PASSWORD (see the header of this script).",
    );
    process.exit(1);
  }
  if (roleArg !== undefined && !ROLES.includes(roleArg)) {
    console.error(`--role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const password =
    process.env.OPERATOR_PASSWORD ?? (process.stdin.isTTY ? await promptHiddenPassword() : undefined);
  if (!password) {
    console.error("No password: run interactively or set OPERATOR_PASSWORD.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("The operator password must be at least 12 characters.");
    process.exit(1);
  }

  const role = (roleArg as OperatorRole | undefined) ?? null;
  const passwordHash = await hashPassword(password);

  const prisma = new PrismaClient();
  try {
    const operator = await prisma.operator.upsert({
      where: { email },
      create: { email, name, role, passwordHash, status: "active" },
      update: { name, role, passwordHash, status: "active" },
    });
    console.log(
      `Operator ready: ${operator.email} (${operator.name}) role=${operator.role ?? "unrestricted"}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
