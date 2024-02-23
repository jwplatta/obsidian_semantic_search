import {
    Plugin, TFile, FileSystemAdapter
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
    embeddingsInfo
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
                // TODO: move to service file
                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };
                const response = await fetch(new URL('http://localhost:3003/embedded_files'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dbDetails)
                });

                const responseJSON = await response.json();

                const fileNames = responseJSON.map((file: any) => file.file_name);
                console.log('fileNames:\n', fileNames);

                const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
                console.log('markdownFiles in Vault:\n', markdownFiles.length);

                const filteredMarkdownFiles = markdownFiles.filter(file => !fileNames.includes(file.name));
                console.log('filteredMarkdownFiles:\n', filteredMarkdownFiles);

                const filteredFileNames = filteredMarkdownFiles.map(file => file.name);
                // const indexedFiles = fileNames.map((fileName: string) => {
                //     return markdownFiles.find((file) => file.name === fileName);
                // });
                new MessageModal(
                    this.app,
                    filteredFileNames.join('\n')
                ).open();
            }
        })

        this.addCommand({
            id: 'embed-file',
            name: 'Embed File',
            callback: async () => {
                const currentFile = this.app.workspace.getActiveFile();

                if (currentFile && currentFile.extension === 'md') {
                    try {
                        const fileDetails = {
                            model: this.settings.embeddingModel,
                            vaultPath: this.getBasePath(),
                            pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search',
                            fileName: currentFile.name,
                            filePath: currentFile.path,
                            chunkSize: this.settings.chunkSize
                        };
                        embedFile(fileDetails);
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
                // TODO: Move to service file
                const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
                const fileCount = markdownFiles.length;
                console.log('Embedding ', fileCount, ' files.');

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
                    const response = embedBatch(
                        batch,
                        this.settings.embeddingModel,
                        this.getBasePath(),
                        this.getBasePath() + '/.obsidian/plugins/semantic_search',
                        this.settings.chunkSize
                    );
                    console.log(response);
                    embeddedCount += batch.length;
                    this.embedStatusBar.setText(`Embedded file ${embeddedCount} of ${fileCount}`);
                }

                const dbDetails = {
                    vaultPath: this.getBasePath(),
                    pluginPath: this.getBasePath() + '/.obsidian/plugins/semantic_search'
                };
                try {
                    updateEmbeddingIndex(dbDetails);
                } catch (error) {
                    console.error('Error updating embedding index:', error, dbDetails);
                }

                console.log('Done embedding vault.');
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