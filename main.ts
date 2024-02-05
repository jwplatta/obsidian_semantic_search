import {
	App, Editor,
	MarkdownView,
	Modal, Notice, moment, Plugin, TFile,
	PluginSettingTab, Setting, SuggestModal, TextAreaComponent, ButtonComponent, TAbstractFile
} from 'obsidian';

interface SemanticSearchSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: SemanticSearchSettings = {
	apiKey: ''
}

export default class SemanticSearchPlugin extends Plugin {
	statusBar: HTMLElement;
	settings: SemanticSearchSettings;

	async onload() {
		console.log("loading semantic search plugin");
		await this.loadSettings();

		this.app.vault.on('modify', async (file) => {
				try {
					console.log('UPDATING EMBEDDINGS', file);
					const result = await this.updateEmbeddings(file);
					console.log(result);
				} catch (error) {
					console.error('Error updating embeddings:', error);
				}
			}
		);

		this.addSettingTab(new SemanticSearchSettingTab(this.app, this));
	}

	async updateEmbeddings(file: TAbstractFile) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve('embeddings updated');
			}, 10000);
		});
	}

	async onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SemanticSearchSettingTab extends PluginSettingTab {
	plugin: SemanticSearchPlugin;

	constructor(app: App, plugin: SemanticSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Enter your OpenAI API key here.')
			.addText(text => text
				.setPlaceholder('API Key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				})
				.then((cb) => {
					cb.inputEl.style.width = '100%';
				}));

	}
}