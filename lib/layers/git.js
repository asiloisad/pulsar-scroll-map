const { Directory } = require("atom");
const Layer = require("../layer");

class GitLayer extends Layer {

  constructor(editor) {
    super({ editor: editor, name: "git", timer: 100 });
    this.repository = null;
    this.editorPath = null;
    this.subscribeToRepository();
    this.disposables.add(
      atom.project.onDidChangePaths(() => this.subscribeToRepository()),
      this.editor.onDidChangePath(() => {
        this.editorPath = this.editor.getPath();
        this.subscribeToRepository();
      }),
      this.editor.onDidStopChanging(() => this.update())
    );
  }

  async subscribeToRepository() {
    if (this._repoSubs) {
      this._repoSubs.dispose();
      this.disposables.remove(this._repoSubs);
    }

    this.editorPath = this.editor.getPath();
    if (!this.editorPath) {
      this.repository = null;
      this.update();
      return;
    }

    const directory = new Directory(this.editorPath).getParent();
    this.repository = await atom.project.repositoryForDirectory(directory);

    if (this.repository) {
      const { CompositeDisposable } = require("atom");
      this._repoSubs = new CompositeDisposable(
        this.repository.onDidDestroy(() => this.subscribeToRepository()),
        this.repository.onDidChangeStatuses(() => this.update()),
        this.repository.onDidChangeStatus((changedPath) => {
          if (changedPath === this.editorPath) this.update();
        })
      );
      this.disposables.add(this._repoSubs);
    }

    this.update();
  }

  recalculate() {
    this.items = [];
    if (!this.editor.component || !this.repository || !this.editorPath) {
      return;
    }

    const buffer = this.editor.getBuffer();
    if (!buffer || buffer.isDestroyed()) {
      return;
    }

    const text = buffer.getText();
    const diffs = this.repository.getLineDiffs(this.editorPath, text);
    if (!diffs) {
      return;
    }

    for (const diff of diffs) {
      const { newStart, oldLines, newLines } = diff;
      const startRow = newStart - 1;

      let cls;
      if (oldLines === 0 && newLines > 0) {
        cls = "added";
      } else if (newLines === 0 && oldLines > 0) {
        cls = "removed";
      } else {
        cls = "modified";
      }

      if (newLines > 0) {
        // For additions and modifications, mark each changed line
        for (let i = 0; i < newLines; i++) {
          this.items.push({
            row: this.editor.screenRowForBufferRow(startRow + i),
            cls: cls,
          });
        }
      } else {
        // For removals, mark the line where content was removed
        const row = startRow < 0 ? 0 : startRow;
        this.items.push({
          row: this.editor.screenRowForBufferRow(row),
          cls: cls,
        });
      }
    }
  }

  destroy() {
    if (this._repoSubs) {
      this._repoSubs.dispose();
    }
    this.repository = null;
    super.destroy();
  }
}

module.exports = GitLayer;
