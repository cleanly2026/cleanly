@AGENTS.md

## Stitch Project Implementation Workflow

Whenever the user asks to get any Stitch project and implement it in the app:

1. **Use the `/shadcn-ui` skill** to convert Stitch designs into shadcn/ui components.
2. **Use the glassmorphism registry** via the shadcn MCP and the `/shadcn-ui` skill to apply glassmorphism styling to components.
3. **Implement Motion Primitives** via the shadcn MCP and the `/shadcn-ui` skill to add animations and motion to components.

All three steps are required for every Stitch-to-implementation task. Do not skip the glassmorphism registry or Motion Primitives — they are mandatory parts of the workflow.

## Stitch Prompt Enhancement

Whenever sending a prompt to Stitch (for screen generation, editing, or any Stitch MCP call), **always use the `/enhance-prompt` skill first** to transform the prompt before passing it to Stitch. Never send a raw/unenhanced prompt directly to Stitch.
