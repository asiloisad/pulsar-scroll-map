const Layer = require("../layer");

class DiffLayer extends Layer {
  
  constructor(editor) {
    super({ editor: editor, name: "diff", timer: 100 });
    this.data = null;
  }

  setData(data) {
    this.data = data;
    this.update();
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component || !this.data) {
      return;
    }

    const { chunks, editor1, editor2 } = this.data;
    if (!chunks) {
      return;
    }

    if (this.editor === editor1) {
      for (const chunk of chunks) {
        for (
          let bufferRow = chunk.oldLineStart;
          bufferRow < chunk.oldLineEnd;
          bufferRow++
        ) {
          this.items.push({
            row: this.editor.screenRowForBufferRow(bufferRow),
            cls: "added",
          });
        }
      }
    } else if (this.editor === editor2) {
      for (const chunk of chunks) {
        for (
          let bufferRow = chunk.newLineStart;
          bufferRow < chunk.newLineEnd;
          bufferRow++
        ) {
          this.items.push({
            row: this.editor.screenRowForBufferRow(bufferRow),
            cls: "removed",
          });
        }
      }
    }
  }
}

module.exports = DiffLayer;
