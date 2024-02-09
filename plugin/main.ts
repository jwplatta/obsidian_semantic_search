import {
	// App,
	// Editor,
	MarkdownView,
	Plugin,
	TFile,
	// Modal, moment,
	TAbstractFile,
	// ButtonComponent,
	// TextAreaComponent,
} from 'obsidian';
import { SemanticSearchSettings, SemanticSearchSettingTab, DEFAULT_SETTINGS } from 'src/settings';
import { SearchModal } from 'src/search_modal';
import { Chunk } from 'src/search_modal';

export default class SemanticSearchPlugin extends Plugin {
	statusBar: HTMLElement;
	settings: SemanticSearchSettings;

	async onload() {
		await this.loadSettings();

		this.serverAvailable().then((available: Boolean) => {
			console.log('Server available:', available);
		});

		this.configureVectorStore().then((configured: Boolean) => {
			console.log('Vector store configured:', configured);
		});

		// this.app.vault.on('modify', async (file) => {
		// 		try {
		// 			console.log('UPDATING EMBEDDINGS', file);
		// 			const result = await this.updateEmbeddings(file);
		// 			console.log(result);
		// 		} catch (error) {
		// 			console.error('Error updating embeddings:', error);
		// 		}
		// 	}
		// );

		this.addSettingTab(new SemanticSearchSettingTab(this.app, this));

		this.addCommand({
			id: 'search',
			name: 'Search',
			callback: () => {
				new SearchModal(this.app, this.settings).open();
			}
		});

		this.addCommand({
			id: 'embed-file',
			name: 'Embed File',
			callback: async () => {
				const currentFile = this.app.workspace.getActiveFile();
				// const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// console.log(markdownView?.data);

				await this.embedFile(currentFile as TFile);
			}
		});

		/////////////////////////////////
	  // NOTE: Examples of commands //
		/////////////////////////////////
		this.addCommand({
			id: 'open-file',
			name: 'Open File',
			callback: () => {
				this.app.workspace.openLinkText('Naming and Necessity', '/philosophy/phil of language');
			}
		});

		this.addCommand({
			id: 'list-files',
			name: 'List Files',
			callback: () => {
				const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
				markdownFiles.forEach(file => {
					console.log(file.path);
				});
			}
		})

		this.addCommand({
			id: 'read-file',
			name: 'Read File',
			callback: async () => {
				const filePath = 'philosophy/The Prince.md';
				const file: TFile | null = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;

				// const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				// console.log(markdownView?.data);

				if (file && file instanceof TFile) {
					try {
							const content = await this.app.vault.read(file);
							console.log(`Content of \n\n${file.path}:`, content);
					} catch (error) {
							console.error(`Error reading file ${file.path}:`, error);
					}
				} else {
					console.error('File not found:', filePath);
				}
			}
		})
	}

	async embedFile(file: TFile) {
		// TODO: check if the file is markdown
		if (file && file instanceof TFile) {
			try {
					const content = await this.app.vault.read(file);
					try {
						await fetch('http://localhost:3003/embed', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								vaultPath: this.app.vault.adapter.basePath,
								dataStorePath: this.settings.dataStorePath,
								fileName: file.name,
								filePath: file.path,
								fileContent: content,
								chunkSize: 600 // TODO: get from settings
							})
						});
					} catch (error) {
						console.log('Error embedding file:', error);
					}
			} catch (error) {
					console.error(`Error reading file ${file.path}:`, error);
			}
		} else {
			console.error('File not found:', file);
		}
	}

	async configureVectorStore() {
		try {
			const response = await fetch('http://localhost:3003/configure_db', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					vaultPath: this.app.vault.adapter.basePath,
					dataStorePath: this.settings.dataStorePath
				})
			});

			if (response.ok) {
				return true;
			} else {
				return false;
			}
		} catch (error) {
			return false;
		}

	}

	async serverAvailable() {
		try {
			const response = await fetch('http://localhost:3003/check_status', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				return true;
			} else {
				return false;
			}
		} catch (error) {
			return false;
		}
	}


	// async updateEmbeddings(file: TAbstractFile) {
	// 	return new Promise((resolve, reject) => {
	// 		setTimeout(() => {
	// 			resolve('embeddings updated');
	// 		}, 10000);
	// 	});
	// }


	async onunload() {
		console.log('unloading plugin');
		// TODO: remind user to turn off backend server and explain how
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}