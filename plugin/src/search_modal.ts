import { SuggestModal, Notice } from "obsidian";

export interface Chunk {
  filename: string;
  chunk_text: string;
  link: string;
}

const ALL_TEXT_CHUNKS = [
  {
    filename: "file1",
    chunk_text: "This is a text chunk from file1",
    link: "file1"
  },
  {
    filename: "file2",
    chunk_text: "This is a text chunk from file2",
    link: "file2"
  },
  {
    filename: "file3",
    chunk_text: "This is a text chunk from file3",
    link: "file3"
  }
]

export class SearchModal extends SuggestModal<Chunk> {
  async getSuggestions(query: string): Promise<Chunk[]> {
    try {
      const response = await fetch('http://localhost:3003/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query
        })
      });

      if (response.ok) {
        return ALL_TEXT_CHUNKS;
      } else {
        // TODO: show modal with error message
        return [];
      }
    } catch (error) {
      // TODO: show modal with error message
      return [];
    }
  }

  renderSuggestion(chunk: Chunk, el: HTMLElement) {
    el.createEl("small", { text: chunk.filename });
    el.createEl("div", { text: chunk.chunk_text });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(chunk: Chunk, evt: MouseEvent | KeyboardEvent) {
    // const markdownLink = '[[file.path]]';
    // this.insertTextIntoCurrentEditor(markdownLink);
    // TODO: open file in editor from Chunk.link
    new Notice(`Selected ${chunk.chunk_text} from ${chunk.filename}!`);
  }
}