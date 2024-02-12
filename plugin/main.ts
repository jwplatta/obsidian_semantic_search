import {
    Plugin, TFile, FileSystemAdapter
} from 'obsidian';
import { SemanticSearchSettings, SemanticSearchSettingTab, DEFAULT_SETTINGS } from 'src/ui/settings';
import { SearchModal } from 'src/ui/search_modal';
import { MessageModal } from 'src/ui/message_modal';
import { embedFile, serverAvailable, configureVectorStore } from 'src/api/semantic_search_service';


export default class SemanticSearchPlugin extends Plugin {
    statusBar: HTMLElement;
    settings: SemanticSearchSettings;

    async onload() {
        await this.loadSettings();
        await serverAvailable().then(async (available: boolean) => {
            if (!available) {
                new MessageModal(
                    this.app,
                    'The backend server is not running. Please start the server and reload the plugin.'
			  ).open();
            } else {
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    dataStorePath: this.settings.dataStorePath,
                    dataStoreFilename: this.settings.dataStoreFilename
                };
                await configureVectorStore(dbDetails);
            }
        });

        this.addSettingTab(new SemanticSearchSettingTab(this.app, this as SemanticSearchPlugin));

        this.addCommand({
            id: 'search',
            name: 'Search',
            callback: () => {
                new SearchModal(this.app, this.settings, this.getBasePath()).open();
            }
        });

        this.addCommand({
            id: 'embed-file',
            name: 'Embed File',
            callback: async () => {
                const currentFile = this.app.workspace.getActiveFile();

                if (currentFile && currentFile.extension === 'md') {
                    this.app.vault.read(currentFile).then(async content => {
                        const fileDetails = {
                            model: this.settings.embeddingModel,
                            vaultPath: this.getBasePath(),
                            dataStorePath: this.settings.dataStorePath,
                            dataStoreFilename: this.settings.dataStoreFilename,
                            fileName: currentFile.name,
                            filePath: currentFile.path,
                            fileContent: content,
                            chunkSize: this.settings.chunkSize
                        };

                        embedFile(fileDetails);
                    })
                        .catch(error => {
                            console.error(`Error reading file ${currentFile.path}: `, error);
                        });
                }
            }
        });

        this.addCommand({
            id: 'embed-vault',
            name: 'Embed Vault',
            callback: async () => {
                const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();

                markdownFiles.forEach(async file => {
                    this.app.vault.read(file).then(async content => {
                        const fileDetails = {
                            model: this.settings.embeddingModel,
                            vaultPath: this.getBasePath(),
                            dataStorePath: this.settings.dataStorePath,
                            dataStoreFilename: this.settings.dataStoreFilename,
                            fileName: file.name,
                            filePath: file.path,
                            fileContent: content,
                            chunkSize: this.settings.chunkSize
                        };
                        embedFile(fileDetails);
                    })
                        .catch(error => {
                            console.error(`Error reading file ${file.path}: `, error);
                        });
                });
            }
        });
    }

    getBasePath(): string {
        let adapter = this.app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getBasePath();
        }
        return '/';
    }

    async onunload() {
        new MessageModal(
            this.app,
            'The Semantic Search plugin has been unloaded. Please turn off the server.'
        ).open();
    }

    async loadSettings() {
        console.log(DEFAULT_SETTINGS);
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}