import { Plugin, Editor, MarkdownView, Notice, Setting, PluginSettingTab, App, Modal } from 'obsidian';
import { EditorView, keymap } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

interface MathVariable {
	name: string;
	expression: string;
}

interface PluginSettings {
	defineKeyword: string;
	translateKeyword: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	defineKeyword: '!!',
	translateKeyword: '@'
}

export default class MathVariableExpander extends Plugin {
	private variables: Map<string, string> = new Map();
	public settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		console.log('Loading Math Variable Expander plugin');

		// Register command to manually rescan variables
		this.addCommand({
			id: 'rescan-variables',
			name: 'Rescan variables',
			callback: () => {
				this.parseVariables();
			}
		});

		// Register command to display all variables
		this.addCommand({
			id: 'show-variables',
			name: 'Show all variables',
			callback: () => {
				this.showVariables();
			}
		});

		// Register settings tab
		this.addSettingTab(new MathVariableExpanderSettingTab(this.app, this));

		// Register CodeMirror 6 extension for keydown handling and autocomplete
		this.registerEditorExtension(this.createExtension());
	}

	onunload() {
		console.log('Unloading Math Variable Expander plugin');
		this.variables.clear();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private parseVariables(): boolean {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active file to scan');
			return false;
		}

		const content = activeView.editor.getValue();
		const newVariables = new Map<string, string>();

		// Escape special regex characters in define keyword
		const escapedDefineKeyword = this.settings.defineKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		
		// Find all bond patterns like $!!A = x+1$ (using custom keyword)
		// This matches: $defineKeywordVariableName = expression$
		// The pattern captures everything after = until the closing $
		const variablePattern = new RegExp(`\\$${escapedDefineKeyword}(\\w+)\\s*=\\s*([^$]+)\\$`, 'g');
		let match;
		while ((match = variablePattern.exec(content)) !== null) {
			const variableName = match[1];
			const expression = match[2].trim(); // Trim leading and trailing whitespace from expression
			// Later definitions override earlier ones
			newVariables.set(variableName, expression);
		}

		// Only update if variables changed
		const changed = newVariables.size !== this.variables.size ||
			Array.from(newVariables.entries()).some(([name, expr]) => 
				this.variables.get(name) !== expr
			) ||
			Array.from(this.variables.keys()).some(name => !newVariables.has(name));

		if (changed) {
			this.variables = newVariables;
			const count = this.variables.size;
			new Notice(`Scanned ${count} variable${count !== 1 ? 's' : ''}: ${Array.from(this.variables.keys()).join(', ') || 'none'}`);
			console.log(`Parsed ${this.variables.size} math variable(s):`, 
				Array.from(this.variables.keys()).join(', ') || 'none');
		} else {
			new Notice(`No changes detected. ${this.variables.size} variable${this.variables.size !== 1 ? 's' : ''} found.`);
		}

		return true;
	}

	private showVariables() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active file');
			return;
		}

		if (this.variables.size === 0) {
			new Notice('No variables defined. Use "Rescan variables" command first.');
			return;
		}

		// Create and open a modal with all variables
		const modal = new VariablesModal(this.app, this.variables, this.settings);
		modal.open();
	}

	private createExtension(): Extension {
		return [
			// Autocomplete extension
			autocompletion({
				override: [
					(context: CompletionContext): CompletionResult | null => {
						const { state, pos } = context;
						
						// Check if we're in a math block
						if (!this.isInMathBlock(state.doc, pos)) {
							return null;
						}

						// Get text before cursor
						const line = state.doc.lineAt(pos);
						const lineText = line.text;
						const posInLine = pos - line.from;
						const beforeCursor = lineText.substring(0, posInLine);

						// Escape special regex characters in translate keyword
						const escapedTranslateKeyword = this.settings.translateKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						
						// Check if we're typing the translate keyword
						const translateKeywordMatch = beforeCursor.match(new RegExp(`${escapedTranslateKeyword}(\\w*)$`));
						if (!translateKeywordMatch) {
							return null;
						}

						const prefix = translateKeywordMatch[1]; // The part after the keyword
						const fromPos = pos - this.settings.translateKeyword.length - prefix.length;
						
						// Filter variables that match the prefix
						const matchingVars = Array.from(this.variables.entries())
							.filter(([name]) => name.startsWith(prefix))
							.map(([name, expr]) => ({
								label: name,
								type: 'variable',
								detail: expr,
								info: `Expands to: ${expr}`,
								apply: (view: EditorView, completion: any, from: number, to: number) => {
									// Replace the keyword + variable name with the expression value
									// Use the 'from' and 'to' parameters provided by CodeMirror
									view.dispatch({
										changes: {
											from: from,
											to: to,
											insert: expr
										},
										selection: {
											anchor: from + expr.length,
											head: from + expr.length
										}
									});
								}
							}));

						if (matchingVars.length === 0) {
							return null;
						}

						return {
							from: fromPos,
							to: pos,
							options: matchingVars,
							filter: false // We already filtered
						};
					}
				]
			}),
			// Keymap for space key expansion
			keymap.of([
				{
					key: 'Space',
					run: (view: EditorView) => {
						return this.handleSpaceKey(view);
					}
				}
			])
		];
	}

	private isInMathBlock(doc: any, pos: number): boolean {
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
		if (!this.isInMathBlock(state.doc, pos)) {
			return false; // Don't consume the key, let default behavior happen
		}

		const doc = state.doc;
		const line = doc.lineAt(pos);
		const lineText = line.text;
		const posInLine = pos - line.from;
		const beforeCursor = lineText.substring(0, posInLine);

		// Escape special regex characters in translate keyword
		const escapedTranslateKeyword = this.settings.translateKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		
		// Look for pattern translateKeywordVariableName before the cursor
		const match = beforeCursor.match(new RegExp(`${escapedTranslateKeyword}(\\w+)$`));
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

		// Replace translateKeywordVariableName with the expression
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

class VariablesModal extends Modal {
	variables: Map<string, string>;
	settings: PluginSettings;

	constructor(app: App, variables: Map<string, string>, settings: PluginSettings) {
		super(app);
		this.variables = variables;
		this.settings = settings;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `Variables (${this.variables.size})` });

		if (this.variables.size === 0) {
			contentEl.createEl('p', { text: 'No variables defined.' });
			return;
		}

		const listEl = contentEl.createEl('div', { cls: 'math-variable-list' });
		
		// Sort variables by name for better readability
		const sortedVars = Array.from(this.variables.entries()).sort((a, b) => a[0].localeCompare(b[0]));

		for (const [name, expr] of sortedVars) {
			const itemEl = listEl.createEl('div', { cls: 'math-variable-item' });
			const nameEl = itemEl.createEl('strong', { text: name, cls: 'math-variable-name' });
			nameEl.style.marginRight = '10px';
			const exprEl = itemEl.createEl('code', { text: expr, cls: 'math-variable-expr' });
			exprEl.style.color = 'var(--text-muted)';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class MathVariableExpanderSettingTab extends PluginSettingTab {
	plugin: MathVariableExpander;

	constructor(app: App, plugin: MathVariableExpander) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Math Variable Expander Settings' });

		new Setting(containerEl)
			.setName('Define keyword')
			.setDesc('The keyword used to define variables (e.g., !! in $!!A = x+1$)')
			.addText(text => text
				.setPlaceholder('!!')
				.setValue(this.plugin.settings.defineKeyword)
				.onChange(async (value) => {
					this.plugin.settings.defineKeyword = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Translate keyword')
			.setDesc('The keyword used to translate/expand variables (e.g., @ in $@A$)')
			.addText(text => text
				.setPlaceholder('@')
				.setValue(this.plugin.settings.translateKeyword)
				.onChange(async (value) => {
					this.plugin.settings.translateKeyword = value;
					await this.plugin.saveSettings();
				}));
	}
}
