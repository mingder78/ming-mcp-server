import * as readline from 'readline';
import { spawn } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Spawn the compiled server
const SERVER_PATH = 'build/index.js'; // Adjust if different
const serverProcess = spawn('node', [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseBuffer = '';
serverProcess.stdout.on('data', (data) => {
  console.log(data);
  responseBuffer += data.toString();
  processResponse();
});

serverProcess.on('error', (error) => console.error('Server error:', error));
serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  rl.close();
});

function processResponse() {
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  lines.forEach((line) => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.result?.resources) {
          console.log('Notes:', response.result.resources.map((r: any) => r.name));
        } else if (response.result?.content) {
          console.log('MCP:', response.result.content[0].text);
        } else if (response.result?.messages) {
          console.log('Summary Prompt:', response.result.messages.slice(-1)[0].content.text);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
  });
}

function sendMCPRequest(request: any) {
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

async function startCLI() {
  console.log('MCP Notes CLI (commands: list, read <id>, create <title> <content>, summarize, exit)');

  while (true) {
    const userInput = await new Promise<string>((resolve) => rl.question('You: ', resolve));
    const [command, ...args] = userInput.trim().split(' ');

    if (command.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      serverProcess.kill();
      rl.close();
      break;
    }

    switch (command.toLowerCase()) {
      case 'list':
        sendMCPRequest({ method: 'list_resources', params: {} });
        break;
      case 'read':
        if (args[0]) sendMCPRequest({ method: 'read_resource', params: { uri: `note:///${args[0]}` } });
        else console.log('Usage: read <id>');
        break;
      case 'create':
        if (args.length >= 2) {
          const title = args[0];
          const content = args.slice(1).join(' ');
          sendMCPRequest({
            method: 'call_tool',
            params: { name: 'create_note', arguments: { title, content } }
          });
        } else console.log('Usage: create <title> <content>');
        break;
      case 'summarize':
        sendMCPRequest({ method: 'get_prompt', params: { name: 'summarize_notes' } });
        break;
      default:
        console.log('Unknown command. Try: list, read <id>, create <title> <content>, summarize, exit');
    }
  }
}

startCLI().catch((error) => {
  console.error('CLI failed:', error);
  serverProcess.kill();
  rl.close();
});
