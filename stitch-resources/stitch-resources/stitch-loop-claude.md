# Stitch Landing Page - Project Instructions

## Stitch Design Workflow

When the user asks to create, design, or build any UI/screen/page/component using Stitch, **always follow this 3-step workflow in order**:

### Step 1: Enhance the Prompt (`/enhance-prompt`)
Before sending anything to Stitch, first run the `/enhance-prompt` skill on the user's request. This transforms vague UI ideas into polished, Stitch-optimized prompts with:
- Specific UI/UX keywords and atmosphere descriptors
- Design system context from the project
- Structured output for better generation results

### Step 2: Build with Stitch Loop (`/stitch-loop`)
Take the enhanced prompt from Step 1 and use the `/stitch-loop` skill to iteratively generate and refine the design in Stitch. This runs an autonomous loop that:
- Generates screens from the enhanced prompt
- Reviews and iterates on the output
- Refines until the design meets a high quality bar

### Step 3: Implement in the App (`/react-components`)
Once the Stitch design is finalized, use the `/react-components` skill to:
- Pull the generated design from Stitch
- Convert it into modular React components
- Integrate the components into this Next.js app under `src/`

**Important:** Never skip steps. Always enhance first, then loop for quality, then implement. This ensures the best possible design output every time.
