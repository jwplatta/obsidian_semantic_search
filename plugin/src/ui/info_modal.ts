import { App, Modal } from 'obsidian';

export interface InfoMessage {
    chunkCnt: number;
    vssSize: number;
}

export class InfoModal extends Modal {
    constructor(app: App, public message: InfoMessage) {
        super(app);
        this.message = message;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h4', { text: 'Semantic Search Info' });
        contentEl.createEl('p', { text: "Note Chunk Count: " + this.message.chunkCnt.toString() });
        contentEl.createEl('p', { text: "Index Size: " + this.message.vssSize.toString() });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}