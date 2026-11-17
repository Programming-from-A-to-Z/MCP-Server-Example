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
    }
  );

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
    }
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
