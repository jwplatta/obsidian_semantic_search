import { App, SuggestModal } from 'obsidian';
import { SemanticSearchSettings } from 'src/ui/settings';
import { queryNoteChunks } from 'src/api/semantic_search_service';
import { Chunk } from 'src/chunk_interface';


export class SearchModal extends SuggestModal<Chunk> {
    settings: SemanticSearchSettings;
    vaultPath: string;

    constructor(app: App, settings: SemanticSearchSettings, vaultPath: string) {
        super(app);
        this.settings = settings;
        this.vaultPath = vaultPath;
    }

    async getSuggestions(query: string): Promise<Chunk[]> {
        const queryDetails = {
            model: this.settings.embeddingModel,
            vaultPath: this.vaultPath,
            dataStorePath: this.settings.dataStorePath,
            dataStoreFilename: this.settings.dataStoreFilename,
            query: query,
            searchResultsCount: this.settings.resultCount
        };

        return queryNoteChunks(queryDetails);
    }

    renderSuggestion(chunk: Chunk, el: HTMLElement) {
        el.createEl('h4', { text: chunk.file_name, cls: 'suggestion-file-name' });
        el.createEl('h6', { text: chunk.file_path, cls: 'suggestion-file-path' });
        el.createEl('div', { text: chunk.text_chunk, cls: 'suggestion-text-chunk' });
    }

    onChooseSuggestion(chunk: Chunk, evt: MouseEvent | KeyboardEvent) {
        console.log(evt);
        this.app.workspace.openLinkText(chunk.file_path, '');
    }
}