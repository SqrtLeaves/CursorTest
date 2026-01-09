# Math Variable Expander

An Obsidian plugin that allows you to define math expressions as variables and automatically expand them when typing in math blocks.

## Features

- Define reusable math expressions as variables
- Manual rescanning - variables are only parsed when you explicitly trigger a rescan
- Customizable keywords - change the define keyword (default: `!!`) and translate keyword (default: `@`)
- Autocomplete support - see variable suggestions as you type
- Works with both inline math (`$...$`) and display math (`$$...$$`)
- View all variables in the current file with a command

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
3. Install dependencies (these stay local, not in the plugin folder):
   ```bash
   npm install
   ```
4. Build the plugin:
   ```bash
   npm run build
   ```
5. The built files (`main.js`, `manifest.json`, `styles.css`) will be in the `plugin/` directory
6. Copy only the `plugin/` folder to your Obsidian vault's `.obsidian/plugins/` directory

**Note:** The project is structured so that:
- Development files (source code, `node_modules/`, `package.json`, etc.) stay in the root directory
- Only the `plugin/` folder contains the files needed for Obsidian (no dependencies)
- You can sync only the `plugin/` folder to cloud storage, keeping dependencies local

## Usage

### Settings

You can customize the keywords used for defining and translating variables:

1. Go to **Settings** → **Math Variable Expander**
2. **Define keyword**: The keyword used to define variables (default: `!!`)
   - Example: With `!!`, you define variables as `$!!A = x+1$`
3. **Translate keyword**: The keyword used to expand variables (default: `@`)
   - Example: With `@`, you expand variables as `$@A$`

### Defining Variables

Define variables anywhere in your document using the following syntax:

```markdown
$!!VariableName = math expression here$
```

(Note: `!!` is the default define keyword - you can change it in settings)

The expression includes everything after the `=` sign until the closing `$`. Leading and trailing whitespace is automatically trimmed.

**Example:**
```markdown
$!!A = x \in a$
$!!B = \sum_{i=1}^{n} x_i$
$!!Integral = \int_0^\infty f(x) dx$
$!!A0 = xx$
$!!A1 = yy$
$!!B0 = zz$
$!!Sum = x + y + z$
```

### Rescanning Variables

**Important:** The plugin does NOT automatically scan for variables. You must manually trigger a rescan:

1. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to open the command palette
2. Type "Rescan variables" or "Math Variable Expander: Rescan variables"
3. Select the command to scan and update all variables
4. A notice will appear showing how many variables were found

**When to rescan:**
- After defining new variables
- After updating existing variable definitions
- When switching to a different file

### Using Variables

Inside any math block (inline `$...$` or display `$$...$$`), type:

```
@VariableName
```

(Note: `@` is the default translate keyword - you can change it in settings)

Then press **Space**. The variable will automatically expand to its defined expression.

**Autocomplete:** As you type `@` (or your custom translate keyword), you'll see autocomplete suggestions showing all available variables. If you type part of a variable name (e.g., `@A`), only matching variables will be shown (e.g., `A0`, `A1`).

**Example:**

If you defined:
```markdown
$!!A = x \in a$
```

Then in your document, when you type:
```markdown
We have $@A $ which means...
```

After pressing space, it becomes:
```markdown
We have $x \in a$ which means...
```

### More Examples

**Define multiple variables:**
```markdown
$!!Set = \{x, y, z\}$
$!!Union = A \cup B$
$!!Product = \prod_{i=1}^{n} a_i$
```

**Use them in your math:**
```markdown
The set $@Set $ and the union $@Union $ are related.

Display math:
$$
@Product = \sum_{i=1}^{n} x_i
$$
```

After expansion (when you press space after each `@VariableName`):
```markdown
The set $\{x, y, z\}$ and the union $A \cup B$ are related.

Display math:
$$
\prod_{i=1}^{n} a_i = \sum_{i=1}^{n} x_i
$$
```

### Viewing All Variables

To see all variables currently defined in the active file:

1. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to open the command palette
2. Type "Show all variables" or "Math Variable Expander: Show all variables"
3. Select the command to display all variables

The variables will be displayed in a modal dialog, showing all variable names and their corresponding expressions.

## How It Works

1. **Manual Scanning:** The plugin does NOT automatically scan. You must use the "Rescan variables" command to parse variables from your document
2. **Variable Definitions:** The plugin scans for patterns like `$defineKeywordVariableName = expression$` (default: `$!!VariableName = expression$`). Everything after `=` until the closing `$` is captured as the expression, with leading/trailing whitespace trimmed.
3. **Processing Order:** Variables are processed in document order: later definitions override earlier ones with the same name
4. **Storage:** Variables are stored in memory after scanning
5. **Expansion:** When you type `translateKeywordVariableName` (default: `@VariableName`) followed by space inside a math block:
   - The plugin detects that you're in a math context
   - Finds the variable definition
   - Replaces the keyword and variable name with the stored expression
   - Moves the cursor after the expanded expression
6. **Autocomplete:** As you type the translate keyword, autocomplete shows matching variables filtered by what you've typed so far
7. **Notifications:** A notice appears after scanning showing how many variables were found

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

**Root directory (development files - keep local):**
- `main.ts` - Main plugin source code
- `package.json` - Dependencies and build scripts
- `tsconfig.json` - TypeScript configuration
- `esbuild.config.mjs` - Build configuration
- `node_modules/` - Dependencies (not synced to cloud)
- `copy-plugin-files.mjs` - Script to copy files to plugin folder

**`plugin/` directory (sync to cloud):**
- `main.js` - Built plugin code (generated)
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles

Only the `plugin/` folder needs to be synced to cloud storage or copied to Obsidian. All development dependencies stay in the root directory.

## Limitations

- Variable names must be alphanumeric (after the define keyword)
- Variables must be defined in the format: `$defineKeywordName = expression$` (default: `$!!Name = expression$`)
- The expression includes everything after `=` until the closing `$`
- Leading and trailing whitespace in the expression is automatically trimmed
- Variables are parsed from the current active document only
- Later variable definitions with the same name will override earlier ones
- **Manual scanning required:** Variables are only parsed when you explicitly run the "Rescan variables" command
- Custom keywords must not contain special regex characters that would break pattern matching

## License

MIT

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
