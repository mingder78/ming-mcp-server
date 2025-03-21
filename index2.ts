import { spawn } from "child_process";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Spawn the compiled server
const SERVER_PATH = "build/index.js"; // Adjust if different
const serverProcess = spawn("node", [SERVER_PATH], {
  stdio: ["pipe", "pipe", "inherit"]
});

serverProcess.stdout?.on("data", (data) => {
  console.log(`Server Output: ${data}`);
});

// Allow user input to be sent to the server
rl.on("line", (input) => {
  if (serverProcess.stdin) {
    serverProcess.stdin.write(input + "\n");
  }
});

serverProcess.on("close", (code) => {
  console.log(`Server process exited with code ${code}`);
  rl.close();
});

