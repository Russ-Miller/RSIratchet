// Set or reset the admin password. There is no email reset: the machine
// with the checkout is the reset channel.
//
//   npm run admin:password                 # prompts for a password, writes .env
//   npm run admin:password -- --generate   # makes a strong one and prints it once
//   npm run admin:password -- --vercel     # also pushes the hash to Vercel production
//
// Changing the Vercel value needs a redeploy (npm run deploy) to take effect.
import fs from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const args = process.argv.slice(2);
let password;
if (args.includes("--generate")) {
  password = randomBytes(18).toString("base64url");
  console.log(`generated password (shown once):\n\n  ${password}\n`);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("new admin password: ");
  rl.close();
  if (password.length < 12) { console.log("use at least 12 characters"); process.exit(1); }
}
const salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;

// .env for local runs: replace or append the line.
const envPath = ".env";
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
env = env.replace(/^ADMIN_PASSWORD_HASH=.*\n?/m, "");
if (env && !env.endsWith("\n")) env += "\n";
env += `ADMIN_PASSWORD_HASH=${hash}\n`;
fs.writeFileSync(envPath, env);
console.log("ADMIN_PASSWORD_HASH written to .env");

if (args.includes("--vercel")) {
  spawnSync("npx", ["vercel", "env", "rm", "ADMIN_PASSWORD_HASH", "production", "--yes"], { stdio: "ignore" });
  const r = spawnSync("npx", ["vercel", "env", "add", "ADMIN_PASSWORD_HASH", "production"], { input: hash, stdio: ["pipe", "inherit", "inherit"] });
  console.log(r.status === 0 ? "pushed to Vercel production; run npm run deploy to apply" : "vercel env add failed");
}
