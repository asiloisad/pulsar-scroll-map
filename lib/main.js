const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.layers = {};
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor);
      })
    );
  },

  deactivate() {
    this.layers = {};
    this.disposables.dispose();
  },

  patchEditor(editor) {
    const editorView = editor.getElement();
    if (!editorView) {
      return;
    }
    const scrollView = editorView.querySelector(".vertical-scrollbar");
    if (!scrollView) {
      return;
    }
    const ScrollMap = require("./scrollmap");
    editor.scrollmap = new ScrollMap(editor);
    for (const [name, Layer] of Object.entries(this.layers)) {
      editor.scrollmap.addLayer(name, Layer);
    }
    const resizeObserver = new ResizeObserver(debounce(() => {
      editor.scrollmap?.update();
    }, 100));
    resizeObserver.observe(editorView);
    let disposable = new Disposable(() => {
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

  registerLayer(name, Layer) {
    if (name in this.layers) {
      return;
    }
    this.layers[name] = Layer;
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap?.addLayer(name, Layer);
    }
  },

  unregisterLayer(name) {
    if (!(name in this.layers)) {
      return;
    }
    delete this.layers[name];
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap?.delLayer(name);
    }
  },

  consumeScrollmap(factory) {
    const Layer = require("./layer");
    const { name, Layer: LayerClass } = factory(Layer);
    this.registerLayer(name, LayerClass);
    return new Disposable(() => {
      this.unregisterLayer(name);
    });
  },

  simplemapProvider() {
    return require("./simplemap");
  },
};

function debounce(func, timeout) {
  let timer = null;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, timeout);
  };
}
