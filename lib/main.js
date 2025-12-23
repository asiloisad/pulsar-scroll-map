const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.providers = new Map();
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor);
      }),
    );
  },

  deactivate() {
    this.providers.clear();
    this.disposables.dispose();
  },

  patchEditor(editor) {
    const element = editor.getElement();
    if (!element) {
      return;
    }
    const scrollView = element.querySelector(".vertical-scrollbar");
    if (!scrollView) {
      return;
    }
    const Scrollmap = require("./scrollmap");
    editor.scrollmap = new Scrollmap(editor);
    for (let [name, props] of this.providers) {
      editor.scrollmap.addLayer(name, props)
    }
    const resizeObserver = new ResizeObserver(() => {
      editor.scrollmap.update();
    });
    resizeObserver.observe(element);
    const disposable = new Disposable(() => {
      resizeObserver.disconnect();
      editor.scrollmap.destroy();
    });
    editor.disposables.add(disposable);
    this.disposables.add(disposable);
    scrollView.parentNode.insertBefore(
      editor.scrollmap.element,
      scrollView.nextSibling
    );
  },

  addProvider(name, props) {
    if (this.providers.has(name)) { return; }
    this.providers.set(name, props);
    for (const editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.addLayer(name, props);
    }
  },

  delProvider(name) {
    if (!this.providers.has(name)) { return; }
    this.providers.delete(name);
    for (const editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.delLayer(name);
    }
  },

  consumeScrollmap(provider) {
    this.addProvider(provider.name, provider)
    return new Disposable(() => {
      this.delProvider(provider.name)
    })
  },

  provideSimplemap() {
    return require("./simplemap");
  },
};
