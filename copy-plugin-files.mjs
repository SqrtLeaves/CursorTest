import { copyFileSync, mkdirSync } from 'fs';
import { existsSync } from 'fs';

// Ensure plugin directory exists
if (!existsSync('plugin')) {
	mkdirSync('plugin', { recursive: true });
}

// Copy manifest.json and styles.css to plugin folder
copyFileSync('manifest.json', 'plugin/manifest.json');
copyFileSync('styles.css', 'plugin/styles.css');

console.log('✓ Copied manifest.json and styles.css to plugin/ folder');
