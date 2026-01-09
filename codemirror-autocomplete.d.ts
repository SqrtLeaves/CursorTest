declare module '@codemirror/autocomplete' {
	import { Extension } from '@codemirror/state';
	
	export interface CompletionContext {
		state: any;
		pos: number;
	}
	
	export interface CompletionResult {
		from: number;
		to?: number;
		options: CompletionOption[];
		filter?: boolean;
	}
	
	export interface CompletionOption {
		label: string;
		type?: string;
		detail?: string;
		info?: string;
		apply?: (view: any, completion: CompletionOption, from: number, to: number) => void;
	}
	
	export function autocompletion(config?: {
		override?: Array<(context: CompletionContext) => CompletionResult | null>;
	}): Extension;
}
