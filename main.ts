import { Plugin, Editor, MarkdownView } from 'obsidian';
import { EditorView, keymap } from '@codemirror/view';
import { Extension } from '@codemirror/state';

interface MathVariable {
	name: string;
	expression: string;
}

export default class MathVariableExpander extends Plugin {
	private variables: Map<string, string> = new Map();
	private parseTimeout: NodeJS.Timeout | null = null;

	async onload() {
		console.log('Loading Math Variable Expander plugin');

		// Register event to parse variables when file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.parseVariables();
			})
		);

		// Register event to parse variables when editor changes (debounced for performance)
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				if (this.parseTimeout) clearTimeout(this.parseTimeout);
				this.parseTimeout = setTimeout(() => {
					this.parseVariables();
				}, 500); // Debounce: wait 500ms after last edit
			})
		);

		// Register CodeMirror 6 extension for keydown handling
		this.registerEditorExtension(this.createExtension());

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

	private createExtension(): Extension {
		return keymap.of([
			{
				key: 'Space',
				run: (view: EditorView) => {
					return this.handleSpaceKey(view);
				}
			}
		]);
	}

	private isInMathBlock(view: EditorView, pos: number): boolean {
		const doc = view.state.doc;
		
		// Get all text before the cursor position
		const beforeText = doc.sliceString(0, pos);

		// Check for display math $$...$$
		const beforeDisplayMath = beforeText.match(/\$\$/g);
		if (beforeDisplayMath && beforeDisplayMath.length > 0) {
			// Count if we have an odd number of $$ before cursor
			if (beforeDisplayMath.length % 2 === 1) {
				return true;
			}
		}

		// Check for inline math $...$
		// Remove display math blocks first ($$...$$) to avoid interference
		const withoutDisplayMath = beforeText.replace(/\$\$[\s\S]*?\$\$/g, '');
		
		// Count remaining $ signs
		const dollarCount = (withoutDisplayMath.match(/\$/g) || []).length;
		
		// Odd number means we're inside an inline math block
		return dollarCount % 2 === 1;
	}

	private handleSpaceKey(view: EditorView): boolean {
		const state = view.state;
		const selection = state.selection.main;
		const pos = selection.head;

		// Check if we're inside a math block
		if (!this.isInMathBlock(view, pos)) {
			return false; // Don't consume the key, let default behavior happen
		}

		const doc = state.doc;
		const line = doc.lineAt(pos);
		const lineText = line.text;
		const posInLine = pos - line.from;
		const beforeCursor = lineText.substring(0, posInLine);

		// Look for pattern !!VariableName before the cursor
		const match = beforeCursor.match(/!!(\w+)$/);
		if (!match) {
			return false; // No match, let default behavior happen
		}

		const variableName = match[1];
		const expression = this.variables.get(variableName);

		if (!expression) {
			return false; // Variable not found, let default behavior happen
		}

		// Calculate positions
		const startPos = pos - match[0].length;
		const endPos = pos;

		// Replace !!VariableName with the expression
		view.dispatch({
			changes: {
				from: startPos,
				to: endPos,
				insert: expression
			},
			selection: {
				anchor: startPos + expression.length,
				head: startPos + expression.length
			}
		});

		return true; // Key consumed, prevent default space insertion
	}
}
