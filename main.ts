import { Plugin, Editor, MarkdownView } from 'obsidian';

interface MathVariable {
	name: string;
	expression: string;
}

export default class MathVariableExpander extends Plugin {
	private variables: Map<string, string> = new Map();

	async onload() {
		console.log('Loading Math Variable Expander plugin');

		// Register event to parse variables when file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.parseVariables();
			})
		);

		// Register event to parse variables when editor changes (debounced for performance)
		let parseTimeout: NodeJS.Timeout | null = null;
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				if (parseTimeout) clearTimeout(parseTimeout);
				parseTimeout = setTimeout(() => {
					this.parseVariables();
				}, 500); // Debounce: wait 500ms after last edit
			})
		);

		// Register event listener for keydown to handle expansion
		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			cm.on('keydown', this.handleKeyDown.bind(this));
		});

		// Initial parse
		this.parseVariables();
	}

	onunload() {
		console.log('Unloading Math Variable Expander plugin');
		this.variables.clear();
	}

	private parseVariables() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const content = activeView.editor.getValue();
		const newVariables = new Map<string, string>();

		// Regex to match patterns like $!!A = [x \in a]$
		// This matches: $!!VariableName = [expression]$
		// The pattern allows for whitespace around = and inside brackets
		const variablePattern = /\$!!(\w+)\s*=\s*\[([^\]]+)\]\$/g;

		let match;
		while ((match = variablePattern.exec(content)) !== null) {
			const variableName = match[1];
			const expression = match[2].trim(); // Trim whitespace from expression
			newVariables.set(variableName, expression);
		}

		// Only update if variables changed
		const changed = newVariables.size !== this.variables.size ||
			Array.from(newVariables.entries()).some(([name, expr]) => 
				this.variables.get(name) !== expr
			);

		if (changed) {
			this.variables = newVariables;
			console.log(`Parsed ${this.variables.size} math variable(s):`, 
				Array.from(this.variables.keys()).join(', '));
		}
	}

	private isInMathBlock(cm: CodeMirror.Editor, cursor: CodeMirror.Position): boolean {
		// Get the token at the cursor position
		const token = cm.getTokenAt(cursor);
		
		// Check if the token type indicates we're in a math block
		// Obsidian/CodeMirror uses specific token types for math
		if (token && (token.type === 'math' || token.type === 'math-inline' || token.type === 'math-display')) {
			return true;
		}

		// Fallback: parse the text manually to check if we're inside $...$ or $$...$$
		const line = cm.getLine(cursor.line);
		const lineStart = line.substring(0, cursor.ch);
		const lineEnd = line.substring(cursor.ch);

		// Check for display math $$...$$
		const beforeDisplayMath = lineStart.match(/\$\$/g);
		const afterDisplayMath = lineEnd.match(/\$\$/g);
		if (beforeDisplayMath && beforeDisplayMath.length > 0) {
			// Count if we have an odd number of $$ before cursor
			if (beforeDisplayMath.length % 2 === 1) {
				return true;
			}
		}

		// Check for inline math $...$
		// Get all content before cursor to check for unclosed math
		let beforeText = '';
		for (let i = 0; i < cursor.line; i++) {
			beforeText += cm.getLine(i) + '\n';
		}
		beforeText += lineStart;

		// Remove display math blocks first ($$...$$)
		const withoutDisplayMath = beforeText.replace(/\$\$[\s\S]*?\$\$/g, '');
		
		// Count remaining $ signs
		const dollarCount = (withoutDisplayMath.match(/\$/g) || []).length;
		
		// Odd number means we're inside an inline math block
		return dollarCount % 2 === 1;
	}

	private handleKeyDown(cm: CodeMirror.Editor, event: KeyboardEvent): void {
		// Only handle space key
		if (event.key !== ' ') return;

		const cursor = cm.getCursor();
		
		// Check if we're inside a math block
		if (!this.isInMathBlock(cm, cursor)) return;

		const line = cm.getLine(cursor.line);
		const lineStart = line.substring(0, cursor.ch);

		// Look for pattern !!VariableName before the cursor
		const match = lineStart.match(/!!(\w+)$/);
		if (!match) return;

		const variableName = match[1];
		const expression = this.variables.get(variableName);

		if (!expression) return;

		// Prevent default space insertion
		event.preventDefault();

		// Get the variable pattern position
		const startCh = cursor.ch - match[0].length;
		const endCh = cursor.ch;

		// Replace !!VariableName with the expression
		cm.replaceRange(
			expression,
			{ line: cursor.line, ch: startCh },
			{ line: cursor.line, ch: endCh }
		);

		// Move cursor to after the expression
		const newCursorPos = startCh + expression.length;
		cm.setCursor({ line: cursor.line, ch: newCursorPos });
	}
}
