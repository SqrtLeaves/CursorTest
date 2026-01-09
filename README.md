# Math Variable Expander

An Obsidian plugin that allows you to define math expressions as variables and automatically expand them when typing in math blocks.

## Features

- Define reusable math expressions as variables
- Automatic expansion when typing `!!VariableName` followed by space in math blocks
- Works with both inline math (`$...$`) and display math (`$$...$$`)
- Variables are automatically parsed from your document

## Installation

### Manual Installation

1. Download the latest release from the [releases page](../../releases) (or build from source)
2. Extract the plugin folder to your vault's `.obsidian/plugins/` directory:
   - On Windows: `%APPDATA%\Obsidian\plugins\`
   - On macOS: `~/Library/Application Support/obsidian/plugins/`
   - On Linux: `~/.config/obsidian/plugins/`
3. Restart Obsidian
4. Enable the plugin in Settings → Community plugins

### Building from Source

1. Clone or download this repository
2. Open a terminal in the plugin directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the plugin:
   ```bash
   npm run build
   ```
5. The built files (`main.js`, `manifest.json`, `styles.css`) will be in the plugin directory
6. Copy the entire plugin folder to your Obsidian vault's `.obsidian/plugins/` directory

## Usage

### Defining Variables

Define variables anywhere in your document using the following syntax:

```markdown
$!!VariableName = [math expression here]$
```

**Example:**
```markdown
$!!A = [x \in a]$
$!!B = [\sum_{i=1}^{n} x_i]$
$!!Integral = [\int_0^\infty f(x) dx]$
```

### Using Variables

Inside any math block (inline `$...$` or display `$$...$$`), type:

```
!!VariableName
```

Then press **Space**. The variable will automatically expand to its defined expression.

**Example:**

If you defined:
```markdown
$!!A = [x \in a]$
```

Then in your document, when you type:
```markdown
We have $!!A $ which means...
```

After pressing space, it becomes:
```markdown
We have $x \in a$ which means...
```

### More Examples

**Define multiple variables:**
```markdown
$!!Set = [\{x, y, z\}]$
$!!Union = [A \cup B]$
$!!Product = [\prod_{i=1}^{n} a_i]$
```

**Use them in your math:**
```markdown
The set $!!Set $ and the union $!!Union $ are related.

Display math:
$$
!!Product = \sum_{i=1}^{n} x_i
$$
```

After expansion (when you press space after each `!!VariableName`):
```markdown
The set $\{x, y, z\}$ and the union $A \cup B$ are related.

Display math:
$$
\prod_{i=1}^{n} a_i = \sum_{i=1}^{n} x_i
$$
```

## How It Works

1. The plugin scans your document for variable definitions matching the pattern `$!!VariableName = [expression]$`
2. Variables are stored in memory and updated automatically when you edit the document
3. When you type `!!VariableName` followed by space inside a math block, the plugin:
   - Detects that you're in a math context
   - Finds the variable definition
   - Replaces `!!VariableName` with the stored expression
   - Moves the cursor after the expanded expression

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development build (with watch mode)
npm run dev
```

### Project Structure

- `main.ts` - Main plugin code
- `manifest.json` - Plugin metadata
- `package.json` - Dependencies and build scripts
- `tsconfig.json` - TypeScript configuration
- `esbuild.config.mjs` - Build configuration
- `styles.css` - Plugin styles (currently empty)

## Limitations

- Variable names must start with `!!` followed by alphanumeric characters
- Variables must be defined in the format: `$!!Name = [expression]$`
- Variable definitions cannot contain nested square brackets `[` `]` in the expression (they must be escaped if needed)
- Variables are parsed from the current active document only

## License

MIT

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
