const Layer = require("../layer");

class CursorLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "cursor", timer: 10 });
    this.disposables.add(
      this.editor.observeCursors(this.update),
      this.editor.onDidRemoveCursor(this.update),
      this.editor.onDidChangeCursorPosition(this.update)
    );
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component) {
      return;
    }
    let positions = this.editor.getCursorScreenPositions();
    if (this.threshold && this.threshold < positions.length) {
      return;
    }
    this.items = positions.map((position) => {
      return { row: position.row };
    });
  }
}

module.exports = CursorLayer;
