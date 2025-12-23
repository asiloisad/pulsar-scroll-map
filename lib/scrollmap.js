/** @babel */
/** @jsx etch.dom */

const etch = require("etch");
etch.setScheduler(atom.views);
const { CompositeDisposable } = require("atom");
const { throttle } = require("./utils");

class Scrollmap {

  constructor(editor) {
    this.editor = editor;
    this.layers = new Map();
    this.markerHeight = null;
    this.update = throttle(() => {
      this.updateLayers() }, 50);
    this.refresh = throttle(() => {
      this.refreshLayers() }, 50);
    this.disposables = new CompositeDisposable(
      this.editor.onDidAddDecoration(this.refresh),
      this.editor.onDidRemoveDecoration(this.refresh),
      this.editor.onDidUpdateDecorations(this.refresh),
    );
    etch.initialize(this);
  }

  destroy() {
    this.disposables.dispose();
    for (let [name, layer] of this.layers) {
      layer.destroy();
    }
    this.layers.clear();
    etch.destroy(this);
  }

  addLayer(name, props) {
    if (this.layers.has(name)) { return; }
    const Layer = require("./layer");
    const layer = new Layer(this.editor, props);
    this.layers.set(name, layer);
  }

  delLayer(name) {
    if (!this.layers.has(name)) { return; }
    const layer = this.layers.get(name);
    layer.destroy();
    this.layers.delete(name);
  }

  render() {
    if (!this.editor || !this.editor.component) {
      return <div class="scrollmap"/>
    }
    const editorHeight = this.editor.component.getScrollHeight();
    if (editorHeight <= 0) {
      return <div class="scrollmap"/>
    }
    const lineHeight = this.editor.component.getLineHeight();
    if (lineHeight <= 0) {
      return <div class="scrollmap"/>
    }
    const clientHeight = this.editor.component.getScrollContainerClientHeight();
    if (clientHeight <= 0) {
      return <div class="scrollmap"/>
    }
    const markerHeight = Math.ceil(lineHeight/editorHeight*clientHeight);
    if (markerHeight !== this.markerHeight) {
      this.markerHeight = markerHeight
      this.editor.element.style.setProperty('--scrollmap-marker-height', `${markerHeight}px`);
    }
    const items = [];
    for (let [name, layer] of this.layers) {
      for (let i = 0; i < layer.items.length; i++) {
        const item = layer.items[i];
        const stl = `transform:translateY(${item.pix*clientHeight/editorHeight}px)`
        const key = `${name}-${item.row}-${i}`
        items.push(<div key={key} class={item.cls} style={stl} onclick={() => this.scrollToRow(item.row)} />);
      }
    }
    return <div class="scrollmap">{items}</div>;
  }

  updateView() {
    etch.update(this)
  }

  updateLayers() {
    this.layers.forEach((layer) => {
      layer.update()
    })
  }

  refreshLayers() {
    this.layers.forEach((layer) => {
      layer.refresh()
    })
  }

  scrollToRow(row) {
    this.editor.setCursorScreenPosition([row, 0]);
    this.editor.scrollToCursorPosition({ center: true });
  }

}

module.exports = Scrollmap;
