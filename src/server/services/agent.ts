import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runAgentTest(input: {
  agentId: string;
  message: string;
  local?: boolean;
}) {
  const args = ["agent", "--agent", input.agentId, "--message", input.message, "--json"];

  if (input.local) {
    args.push("--local");
  }

  const { stdout, stderr } = await execFileAsync("openclaw", args, {
    timeout: 120000
  });

  return {
    stdout,
    stderr
  };
}

