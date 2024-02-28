import {
    Plugin, TFile, FileSystemAdapter, Notice
} from 'obsidian';
import { SemanticSearchSettings, SemanticSearchSettingTab, DEFAULT_SETTINGS } from 'src/ui/settings';
import { SearchModal } from 'src/ui/search_modal';
import { InfoModal } from 'src/ui/info_modal';
import { MessageModal } from 'src/ui/message_modal';
import {
    embedFile,
    embedBatch,
    serverAvailable,
    configureVectorStore,
    updateEmbeddingIndex,
    embeddingsInfo,
    embeddedFiles,
    resetEmbeddingIndex
} from 'src/api/semantic_search_service';


export default class SemanticSearchPlugin extends Plugin {
    embedStatusBar: HTMLElement;
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
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };
                await configureVectorStore(dbDetails);
            }
        });

        this.embedStatusBar = this.addStatusBarItem();

        this.addSettingTab(new SemanticSearchSettingTab(this.app, this as SemanticSearchPlugin));

        this.addCommand({
            id: 'embeddings-info',
            name: 'Info',
            callback: async () => {
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };

                const info = await embeddingsInfo(dbDetails);
                new InfoModal(
                    this.app,
                    {
                        vssSize: info.vssSize,
                        chunkCnt: info.chunkCnt
                    }
                ).open();
            }
        });

        this.addCommand({
            id: 'reset-embedding-index',
            name: 'Reset Index',
            callback: async () => {
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };

                await resetEmbeddingIndex(dbDetails);

                new Notice('VSS Index reset.');
            }
        });

        this.addCommand({
            id: 'search',
            name: 'Search',
            callback: () => {
                new SearchModal(this.app, this.settings, this.getBasePath()).open();
            }
        });

        this.addCommand({
            id: 'unindexed-files',
            name: 'Unindexed Files',
            callback: async () => {
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };

                const fileNames = await embeddedFiles(dbDetails);
                const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
                const filteredMarkdownFiles = markdownFiles.filter(file => !fileNames.includes(file.name));
                const filteredFileNames = filteredMarkdownFiles.map(file => file.name);
                new MessageModal(
                    this.app,
                    filteredFileNames.join('\n')
                ).open();
            }
        });

        this.addCommand({
            id: 'embed-file',
            name: 'Embed File',
            callback: async () => {
                const currentFile = this.app.workspace.getActiveFile();

                if (currentFile && currentFile.extension === 'md') {
                    try {
                        const fileDetails = {
                            fileName: currentFile.name,
                            filePath: currentFile.path,
                        };
                        const embeddingParams = {
                            model: this.settings.embeddingModel,
                            vaultPath: this.getBasePath(),
                            pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search',
                            chunkSize: this.settings.chunkSize
                        };

                        await embedFile(fileDetails, embeddingParams);
                        new Notice(`${currentFile.name} successfully embedded.`);
                    } catch (error) {
                        console.error('Error embedding file:', error);
                    }
                }
            }
        });

        this.addCommand({
            id: 'update-embedding-index',
            name: 'Update Index',
            callback: async () => {
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };
                try {
                    updateEmbeddingIndex(dbDetails);
                } catch (error) {
                    console.error('Error updating embedding index:', error, dbDetails);
                }
            }
        });

        this.addCommand({
            id: 'embed-vault',
            name: 'Embed Vault',
            callback: async () => {
                const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
                const fileCount = markdownFiles.length;
                console.log('Embedding ', fileCount, ' files.');
                const embeddingParams = {
                    model: this.settings.embeddingModel,
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search',
                    chunkSize: this.settings.chunkSize
                };

                let embeddedCount = 0;
                this.embedStatusBar.setText(`Embedded file ${embeddedCount} of ${fileCount}`);
                const batches = [];
                const batchSize = 20; // TODO: Make this a setting
                for (let i = 0; i < markdownFiles.length; i += batchSize) {
                    const files = markdownFiles.slice(i, i + batchSize);
                    const batch = files.map((file) => {
                        return {
                            fileName: file.name,
                            filePath: file.path
                        };
                    });
                    batches.push(batch);
                }

                for (const batch of batches) {
                    const response = await embedBatch(
                        batch,
                        embeddingParams
                    );
                    console.log(response);
                    embeddedCount += batch.length;
                    this.embedStatusBar.setText(`Embedded file ${embeddedCount} of ${fileCount}`);
                }

                new Notice('Vault embedding complete. Update VSS Index.');
            }
        });
    }

    getBasePath(): string {
        const adapter = this.app.vault.adapter;
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