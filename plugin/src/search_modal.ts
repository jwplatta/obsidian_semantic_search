import { App, SuggestModal, Notice } from "obsidian";
import { SemanticSearchSettings } from 'src/settings';

export interface Chunk {
  file_name: string;
  file_path: string;
  text_chunk: string;
}

const ALL_TEXT_CHUNKS = [
  {
    file_name: "file1",
    file_path: "file1",
    text_chunk: "This is a text chunk from file1",
  },
  {
    file_name: "file2",
    file_path: "file2",
    text_chunk: "This is a text chunk from file2",
  },
  {
    file_name: "file3",
    file_path: "file3",
    text_chunk: "This is a text chunk from file3",
  }
]

export class SearchModal extends SuggestModal<Chunk> {
  settings: SemanticSearchSettings;

  constructor(app: App, settings: SemanticSearchSettings) {
    super(app);
    this.settings = settings;
  }

  async getSuggestions(query: string): Promise<Chunk[]> {
    try {
      const response = await fetch('http://localhost:3003/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vaultPath: this.app.vault.adapter.basePath,
          dataStorePath: this.settings.dataStorePath,
          query: query,
          searchResultsCount: 5
        })
      });

      if (response.ok) {
        const chunks = await response.json();
        console.log('Chunks:', chunks);
        return chunks;
      } else {
        // TODO: show modal with error message
        return [];
      }
    } catch (error) {
      // TODO: show modal with error message
      console.error('Error querying server:', error);
      return [];
    }
  }

  renderSuggestion(chunk: Chunk, el: HTMLElement) {
    el.createEl("small", { text: chunk.file_path });
    el.createEl("div", { text: chunk.text_chunk });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(chunk: Chunk, evt: MouseEvent | KeyboardEvent) {
    const markdownLink = `[[${chunk.file_path}]]`;
    // this.app.insertTextIntoCurrentEditor(markdownLink);
    this.app.workspace.openLinkText(chunk.file_path, "");

    // TODO: open file in editor from Chunk.link
    // new Notice(`Selected ${chunk.text_chunk} from ${chunk.file_name}!`);
  }
}