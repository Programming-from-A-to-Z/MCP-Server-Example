# MCP Server Example

- For more, see [MCP & Agents](https://github.com/Programming-from-A-to-Z/A2Z-F26/tree/main/09-mcp-agents) on the A2Z syllabus.

## Set up (node.js)

```bash
mkdir hello-mcp
cd hello-mcp
npm init -y
npm install @modelcontextprotocol/server @modelcontextprotocol/express @modelcontextprotocol/node express zod
```

Don't forget to include `"type": "module"` in `package.json`!

```json
{
  "name": "mcp-hello-world",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/express": "^2.0.2",
    "@modelcontextprotocol/node": "^2.1.2",
    "@modelcontextprotocol/server": "^2.4.0",
    "express": "^5.3.0",
    "zod": "^4.6.7"
  }
}
```

### Server code

```js
import { z } from 'zod';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';

// Create the server and register tools
function createServer() {
  const server = new McpServer({
    name: 'hello-mcp',
    version: '1.0.0',
  });

  server.registerTool(
    // Name of the tool and input / output specification
    'say_hello',
    {
      title: 'Say Hello',
      description: 'Return a friendly greeting',
      inputSchema: z.object({ name: z.string() }),
      outputSchema: z.object({ greeting: z.string() }),
    },
    // Code for when the tool executes
    async ({ name }) => {
      console.log('say_hello called with name:', name);
      const greeting = `Hello, ${name}!`;

      return {
        content: [{ type: 'text', text: greeting }],
        structuredContent: { greeting },
      };
    },
  );

  return server;
}

// This makes the server compatible with express
const handler = toNodeHandler(createMcpHandler(createServer));

// Special MCP Express app
const app = createMcpExpressApp();
// The route for requests
app.all('/mcp', (req, res) => handler(req, res, req.body));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`MCP Hello server running on http://localhost:${port}/mcp`);
});
```

Run:

```bash
npm start
```

You should see:

```text
MCP Hello server running on http://localhost:3000/mcp
```

This example MCP server has just one tool

- `say_hello(name: string)`

### Configure MCP in LM Studio

An easy way to test your MCP Server is to add it to LM Studio. You can set it up from the `mcp.json` file.

1. Download a model that can call tools (suggested: `gemma-4-12b-qat` or `qwen3.8-27b`)
2. Create a new chat and click the integrations plug icon --> Install --> edit `mcp.json`.
3. Add your local MCP server!

```json
{
  "mcpServers": {
    "hello-mcp": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Chat

Make sure tools are enabled and try in your chat:

```text
Call say_hello for {"name": "ITP Student"} and show me the result!
```

You can also try and see if the model will intelligently call the tool on its own. (This is how you want it to work.)

```text
Say hello to ITP student!
```

You can try flipping the model's reasoning ("thinking") setting on and off.

### Calling a Weather API

Let's make a more useful tool. Register a new one inside `createServer()`, and before `return server;`

```js
server.registerTool(
  'get_weather',
  {
    title: 'Get Weather',
    description: 'Fetch current weather using the Open-Meteo API',
    inputSchema: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    outputSchema: z.object({
      temperature: z.number(),
      precipitation: z.number(),
      humidity: z.number(),
    }),
  },
  async ({ latitude, longitude }) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code,relative_humidity_2m`;
    const response = await fetch(url);
    const data = await response.json();
    const current = data.current;
    const { temperature_2m, precipitation, relative_humidity_2m } = current;

    const summary = `Current temperature: ${temperature_2m}°C, precipitation: ${precipitation}mm, humidity: ${relative_humidity_2m}%`;

    console.log('get_weather called with', { latitude, longitude });
    console.log('get_weather result:', summary);

    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: {
        temperature: temperature_2m,
        precipitation: precipitation,
        humidity: relative_humidity_2m,
      },
    };
  },
);
```

Re-run the server and try a new chat prompt.

```text
Call the "get_weather" tool with {"latitude": 40.7128, "longitude": -74.0060} and show me the result.
```

Or see if it can figure out the right tool to call and figure out latitude and longitude for itself!

```text
Tell me the weather in New York City.
```

### Agents

What happens in LM Studio is a "loop": the model receives your prompt, asks LM Studio to run one or more tools, and then reads the tools' results. It might then choose to call more tools. And so on. For how to create your own agentic loops, see the [A2Z Agent Examples](https://github.com/Programming-from-A-to-Z/Agent-Examples). The [`2-mcp-agent.js`](https://github.com/Programming-from-A-to-Z/Agent-Examples/blob/main/2-mcp-agent.js) code works with this example MCP Server.

### 3rd party MCP Servers

You can add other MCP Servers (some require an account, an API key, payment, etc.). One example is [Brave Web Search](https://brave.com/search/api/):

```json
{
  "mcpServers": {
    "hello-mcp": {
      "url": "http://localhost:3000/mcp"
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "API KEY HERE"
      }
    }
  }
}
```

Try these prompts:

```text
Call the "brave_web_search" tool with {"query": "p5.js creative coding", "count": 3} and summarize the top results.
```

```text
Search the web for "p5.js creative coding" summarize what you find!
```

### jina.ai

Also, jina.ai offers its MCP server with access to some tools with a free API key

```json
    "jina-mcp-server": {
      "url": "https://mcp.jina.ai/sse",
      "headers": {
        "Authorization": "Bearer ${JINA_API_KEY}"
      }
    }
```

_(This belongs in LM Studio "mcpServers" merged with any existing entries.)_

For example, it can read a webpage.

```text
Please read https://natureofcode.com/ and summarize it.
```

## MCP Inspector

For debugging, you can also use the **MCP Inspector**

```bash
npx @modelcontextprotocol/inspector
```

## MCP servers can also connect to commercial LLM tools

- [Claude Desktop / Claude Code](https://docs.claude.com/en/docs/mcp)
- [VS Code with GitHub Copilot MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [How to add Brave Search to Claude Desktop with MCP](https://brave.com/search/api/guides/use-with-claude-desktop-with-mcp)
