import { App, Modal } from "obsidian";

export class MessageModal extends Modal {
  constructor(app: App, public message: string) {
    super(app);
    this.message = message;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText(this.message);
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}