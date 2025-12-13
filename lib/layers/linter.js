const Layer = require("../layer");

class LinterLayer extends Layer {
  
  constructor(editor) {
    super({ editor: editor, name: "linter", timer: 50 });
    this.data = [];
  }

  setData({ added, messages, removed }) {
    let editorPath = this.editor.getPath();
    let updateRequired = false;
    if (added.filter((item) => item.location.file === editorPath).length) {
      updateRequired = true;
    } else if (
      removed.filter((item) => item.location.file === editorPath).length
    ) {
      updateRequired = true;
    }
    if (updateRequired) {
      this.data = messages.filter(
        (item) => item.location.file === editorPath
      );
      this.update();
    }
  }

  recalculate() {
    this.items = this.data.map((message) => {
      return {
        row: this.editor.screenPositionForBufferPosition(
          message.location.position.start
        ).row,
        cls: message.severity,
      };
    });
  }
}

module.exports = LinterLayer;
