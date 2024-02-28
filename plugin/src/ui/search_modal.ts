import { App, SuggestModal } from 'obsidian';
import { SemanticSearchSettings } from 'src/ui/settings';
import { queryNoteChunks } from 'src/api/semantic_search_service';
import { Chunk } from 'src/interfaces';


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
            pluginPath: this.vaultPath + '/.obsidian/plugins/semantic_search',
            query: query,
            searchResultsCount: this.settings.resultCount
        };

        return queryNoteChunks(queryDetails);
    }

    renderSuggestion({ file_name, file_path, text_chunk }: Chunk, el: HTMLElement) {
        el.createEl('h4', { text: file_name, cls: 'suggestion-file-name' });
        el.createEl('h6', { text: file_path, cls: 'suggestion-file-path' });
        el.createEl('div', { text: text_chunk, cls: 'suggestion-text-chunk' });
    }

    onChooseSuggestion({ file_path }: Chunk, evt: MouseEvent | KeyboardEvent) {
        console.log(evt);
        this.app.workspace.openLinkText(file_path, '');
    }
}