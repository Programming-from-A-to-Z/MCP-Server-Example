import express from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const server = new McpServer({
  name: 'hello-mcp',
  version: '1.0.0',
});

server.registerTool(
  'say_hello',
  {
    title: 'Say Hello',
    description: 'Return a friendly greeting',
    inputSchema: { name: z.string() },
    outputSchema: { greeting: z.string() },
  },
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
    inputSchema: {
      latitude: z.number(),
      longitude: z.number(),
    },
    outputSchema: {
      temperature: z.number(),
      precipitation: z.number(),
      humidity: z.number(),
    },
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

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`MCP Hello server running on http://localhost:${port}/mcp`);
});
