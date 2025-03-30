import { assertEquals, assertExists } from "https://deno.land/std@0.220.1/assert/mod.ts";

Deno.test("CLI basic functionality", async () => {
  // Test version command
  const versionProcess = new Deno.Command("permit-cli", {
    args: ["--version"],
    stdout: "piped",
  });
  const { stdout } = await versionProcess.output();
  const version = new TextDecoder().decode(stdout);
  assertExists(version, "Version should be returned");
  assertEquals(version.includes("permit-cli"), true, "Version should contain permit-cli");

  // Test help command
  const helpProcess = new Deno.Command("permit-cli", {
    args: ["--help"],
    stdout: "piped",
  });
  const { stdout: helpStdout } = await helpProcess.output();
  const help = new TextDecoder().decode(helpStdout);
  assertExists(help, "Help should be returned");
  assertEquals(help.includes("Usage:"), true, "Help should contain usage information");

  // Test basic command (adjust based on your CLI's actual commands)
  const basicProcess = new Deno.Command("permit-cli", {
    args: ["pdp", "check", "--help"],
    stdout: "piped",
  });
  const { stdout: basicStdout } = await basicProcess.output();
  const basic = new TextDecoder().decode(basicStdout);
  assertExists(basic, "Basic command should return output");
}); 