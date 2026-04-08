# Stitch + Claude Code Resource Pack

Resources for using Google Stitch with Claude Code to build apps with unique, consistent designs.

## What's Inside

### Claude.md Files (Workflow Configs)

These go into your project root as `CLAUDE.md` so Claude Code follows the workflow automatically.

- **`stitch-loop-claude.md`** — 3-step workflow: Enhance Prompt → Stitch Loop → React Components. Use this when building a full UI from scratch with Stitch.
- **`shadcn-loop-claude.md`** — Fetches Stitch designs and implements them using shadcn/ui components with glassmorphism and motion primitives. Use this when converting Stitch projects into interactive apps.

### Design Template

- **`design-template.md`** — A complete design.md example showing the structure Stitch expects. Use this as a reference when creating your own design systems, or modify it directly for your project.

### Skills (`.claude/skills/`)

These are Claude Code skills that get loaded automatically when referenced in your workflow.

| Skill | What It Does |
|---|---|
| **enhance-prompt** | Transforms vague prompts into Stitch-optimized prompts using mood keywords and design context |
| **stitch-loop** | Autonomous loop that generates and refines designs in Stitch via MCP |
| **stitch-design** | Workflows for generating, editing, and extracting design.md files from Stitch projects |
| **design-md** | Converts Stitch projects into agent-friendly design.md files |
| **react-components** | Converts Stitch HTML output into modular React components |
| **shadcn-ui** | Guides conversion of Stitch designs into shadcn/ui components with registry support |
| **remotion** | Converts Stitch screens into Remotion video compositions |

## Setup

### 1. Install Stitch MCP

Stitch MCP is required for the loop and design workflows. Follow the setup instructions from Google's documentation or check the MCP installation video linked in the description.

### 2. (Optional) Install shadcn MCP

If using the shadcn workflow, set up the shadcn MCP server as well. This enables registry-based component installation (glassmorphism, motion primitives, etc.).

### 3. Copy Files Into Your Project

```
# Copy the skills folder into your project
cp -r .claude/ your-project/.claude/

# Pick the workflow you want and copy it as CLAUDE.md
cp stitch-loop-claude.md your-project/CLAUDE.md
# OR
cp shadcn-loop-claude.md your-project/CLAUDE.md
```

### 4. (Optional) Create Your Own Design System

You can create a custom `design.md` using the template:

1. Copy `design-template.md` and modify it for your project's style
2. Upload it to Stitch under "Create New Design System" → paste into the design.md section → Save
3. Stitch will visualize the design system and use it for all subsequent generations

Or generate one from a brainstorming session by giving Claude the template structure along with your style preferences.

## Workflows Covered

### 1. Design.md Transfer
Create a design.md with any agent, bring it to Stitch, and maintain consistent styling across pages.

### 2. Redesign from Reference
Use a full-page screenshot or URL to import a design system from an existing site. Stitch pulls the patterns and applies them to your project without cloning.

### 3. Stitch Loop (Full Build)
Enhanced prompt → Stitch generation → React implementation. Uses `stitch-loop-claude.md`.

### 4. Shadcn Components
Fetch Stitch designs and implement them with shadcn/ui, registries, and animations. Uses `shadcn-loop-claude.md`.
