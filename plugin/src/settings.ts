import {
	App,
	PluginSettingTab,
  Setting
} from 'obsidian';
import { SemanticSearchPlugin } from 'main';


export interface SemanticSearchSettings {
	apiKey: string;
	dataStorePath: string;
}

export const DEFAULT_SETTINGS: SemanticSearchSettings = {
	apiKey: '',
	dataStorePath: '/vector_store.db'
}

export class SemanticSearchSettingTab extends PluginSettingTab {
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

		new Setting(containerEl)
			.setName('Data Store Path')
			.setDesc('Enter the path to the vector store here.')
			.addText(text => text
				.setPlaceholder('Data Store Path')
				.setValue(this.plugin.settings.dataStorePath)
				.onChange(async (value) => {
					// TODO: move the vector store to the new path if it exists
					this.plugin.settings.dataStorePath = value;
					await this.plugin.saveSettings();
				})
				.then((cb) => {
					cb.inputEl.style.width = '100%';
				}));

		// TODO: configure model for embeddings
		// TODO: configure number of similar documents to return
	}
}