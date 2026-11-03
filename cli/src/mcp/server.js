import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QueryEngine } from '../analyzer/query-engine.js';

export async function startMcpServer(graphData) {
  const queryEngine = new QueryEngine(graphData);

  const server = new Server(
    {
      name: 'graphify-code',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 1. List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'graphify_find_relevant_context',
          description:
            'Finds the top most relevant files and symbols for a coding task or bug without rereading the whole repository. Saves tokens by giving a targeted cheat-sheet.',
          inputSchema: {
            type: 'object',
            properties: {
              task_description: {
                type: 'string',
                description: 'The user prompt or description of the coding task / bug to solve.',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of relevant files to return (default: 6).',
              },
            },
            required: ['task_description'],
          },
        },
        {
          name: 'graphify_blast_radius',
          description:
            'Computes what files, symbols, and downstream components might break if a symbol or file is modified. Includes break risk rating and transitive dependents.',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Symbol name (e.g., "createJob", "RepoJob") or file path (e.g., "src/main/java/.../RepoJobService.java").',
              },
            },
            required: ['target'],
          },
        },
        {
          name: 'graphify_search_symbols',
          description:
            'Search for functions, classes, components, interfaces, or endpoints across the codebase.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Symbol name or search query.',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'graphify_get_symbol_info',
          description:
            'Retrieves details for a symbol: definition line, signature, export status, direct callers, and callees.',
          inputSchema: {
            type: 'object',
            properties: {
              symbol_name: {
                type: 'string',
                description: 'Name of the function, class, or method.',
              },
            },
            required: ['symbol_name'],
          },
        },
        {
          name: 'graphify_call_hierarchy',
          description:
            'Traces incoming callers (who calls this function/class?) or outgoing callees (what does this call?).',
          inputSchema: {
            type: 'object',
            properties: {
              symbol_name: {
                type: 'string',
                description: 'Name of the symbol to trace.',
              },
              direction: {
                type: 'string',
                enum: ['incoming', 'outgoing'],
                description: '"incoming" to see callers, or "outgoing" to see callees (default: incoming).',
              },
            },
            required: ['symbol_name'],
          },
        },
        {
          name: 'graphify_get_architecture_summary',
          description:
            'Returns a high-level overview of the codebase architecture, top central hub files (PageRank), security-sensitive modules, and blast radius hotspots.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'graphify_inspect_file',
          description:
            'Provides a concise summary of a file: its purpose, contained symbols, dependencies, and blast radius without reading the entire raw code.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Relative path of the file to inspect.',
              },
            },
            required: ['file_path'],
          },
        },
      ],
    };
  });

  // 2. Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case 'graphify_find_relevant_context': {
          const limit = Number(args?.limit) || 6;
          result = queryEngine.findRelevantFiles(args?.task_description, limit);
          break;
        }

        case 'graphify_blast_radius': {
          result = queryEngine.getBlastRadius(args?.target);
          break;
        }

        case 'graphify_search_symbols': {
          result = queryEngine.findUsages(args?.query);
          break;
        }

        case 'graphify_get_symbol_info': {
          result = queryEngine.findUsages(args?.symbol_name);
          break;
        }

        case 'graphify_call_hierarchy': {
          const direction = args?.direction || 'incoming';
          result =
            direction === 'outgoing'
              ? queryEngine.findCallees(args?.symbol_name)
              : queryEngine.findCallers(args?.symbol_name);
          break;
        }

        case 'graphify_get_architecture_summary': {
          result = queryEngine.getArchitectureSummary();
          break;
        }

        case 'graphify_inspect_file': {
          result = queryEngine.getBlastRadius(args?.file_path);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${err.message}`,
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[graphify-code] MCP Server running on stdio');
}
