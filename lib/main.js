/** @babel */
/** @jsx etch.dom */

const { CompositeDisposable, Disposable } = require('atom')
const etch = require('etch')

module.exports = {

  activate() {
    this.painters = {}
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        this.patchEditor(editor)
      }),
      atom.workspace.getCenter().observePanes((pane) => {
        let count = 0
        let resizeObserver = new ResizeObserver(() => {
          if ((count+=1)===1) { return }
          for (let item of pane.getItems()) {
            if (atom.workspace.isTextEditor(item)) {
              item.scrollmap.update()
            }
          }
        })
        resizeObserver.observe(pane.getElement())
        let onWillDestroy = pane.onWillDestroy(() => {
          resizeObserver.disconnect() ; this.disposables.add(onWillDestroy)
        })
        this.disposables.add(new Disposable(() => {
          resizeObserver.disconnect()
        }))
      }),
    )
    this.cursorLayer()
  },

  deactivate () {
    for (let name in this.painters) { this.painters[name].dispose() }
    this.painters = {}
    this.disposables.dispose()
  },

  patchEditor(editor) {
    const editorView = editor.getElement()
    if (!editorView) { return }
    const scrollView = editorView.querySelector('.vertical-scrollbar')
    if (!scrollView) { return }
    editor.scrollmap = new ScrollMap(editor)
    scrollView.parentNode.insertBefore(editor.scrollmap.element, scrollView.nextSibling)
    let disposable = new Disposable(() => { editor.scrollmap.destroy() })
    editor.disposables.add(disposable) ; this.disposables.add(disposable)
  },

  registerLayer(name, Layer) {
    if (!(name in this.painters)) {
      this.painters[name] = atom.workspace.observeTextEditors((editor) => {
        editor.scrollmap.addLayer(name, Layer)
      })
    }
  },

  unregisterLayer(name) {
    if (name in this.painters) {
      this.painters[name].dispose()
      delete this.painters[name]
      for (let editor of atom.workspace.getTextEditors()) {
        editor.scrollmap.delLayer(name)
      }
    }
  },

  cursorLayer() {
    if (atom.config.get('scroll-map.cursorLayer.state')) {
      this.registerLayer('cursor', CursorLayer)
    } else {
      this.unregisterLayer('cursor')
    }
  },

  findLayer() {
    if (atom.config.get('scroll-map.findLayer.state')) {
      this.registerLayer('find', FindLayer)
    } else {
      this.unregisterLayer('find')
    }
  },

  naviLayer() {
    if (atom.config.get('scroll-map.naviLayer.state')) {
      this.registerLayer('navi', NaviLayer)
    } else {
      this.unregisterLayer('navi')
    }
  },

  serviceProvider() {
    return {
      registerLayer: (name, Layer) => {
        return this.registerLayer(name, Layer)
      },
      unregisterLayer: (name) => {
        return this.unregisterLayer(name)
      },
    }
  }
}

class ScrollMap {

  constructor(editor) {
    this.editor = editor
    this.layers = {}
    etch.initialize(this)
  }

  addLayer(name, Layer) {
    if (name in this.layers) { return }
    this.layers[name] = new Layer(this.editor)
  }

  delLayer(name) {
    if (!(name in this.layers)) { return }
    this.layers[name].destroy()
    delete this.layers[name]
  }

  render() {
    const items = []
    for (let [name, layer] of Object.entries(this.layers)) {
      for (let item of layer.items) {
        if (!item.top) { continue }
        items.push(<div class={item.c} style={item.s} on={item.o}/>)
      }
    }
    return <div class='scroll-map'>{items}</div>
  }

  update() {
    for (let name in this.layers) {
      this.layers[name].update()
    }
  }

  destroy() {
    for (let name in this.layers) { this.layers[name].destroy() }
    etch.destroy(this)
  }

  scrollTo(screenRow) {
    this.editor.scrollToScreenPosition([screenRow, 0], { center:true })
  }
}


class Layer {

  constructor(props) {
    this.editor = props.editor
    this.name = props.name
    this.items = []
    this.update = throttle(() => this.updateSync(), props.timer)
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe(`scroll-map.${this.name}Layer.threshold`, (value) => {
        this.threshold = value
      }),
    )
  }

  updateSync() {
    this.recalculate()
    this.prepareItems()
    etch.update(this.editor.scrollmap)
  }

  prepareItems() {
    if (!this.editor.component) { return }
    let editorHeight = this.editor.component.getScrollHeight()
    if (!editorHeight) { return }
    for (let item of this.items) {
      item.top = this.editor.component.pixelPositionForScreenPosition({
        row: item.row, column:0 }).top
      item.c = `scroll-item ${this.name}-layer`
      item.s = `top:${this.editor.component.pixelPositionForScreenPosition({
        row: item.row, column:0 }).top/editorHeight*100}%`
      item.o = { click: () => this.editor.scrollToScreenPosition([item.row, 0], { center:true })}
    }
  }

  destroy() {
    this.items = []
    this.disposables.dispose()
  }

}

class CursorLayer extends Layer {

    constructor(editor) {
      super({ editor:editor, name:'cursor', timer:10 })
      this.disposables.add(
        this.editor.observeCursors(this.update),
        this.editor.onDidRemoveCursor(this.update),
        this.editor.onDidChangeCursorPosition(this.update),
      )
    }

    recalculate() {
      this.items = []
      if (!this.editor.component) { return }
      let cursors = this.editor.getCursors()
      if (this.threshold && this.threshold<cursors.length) { return }
      for (let cursor of this.editor.getCursors()) {
        this.items.push({ row: cursor.getScreenPosition().row })
      }
    }

}

class FindLayer extends Layer {

  constructor(editor) {
    super({ editor:editor, name:'find', timer:50 })
    this.package = atom.packages.getLoadedPackage('find-and-replace')
    this.disposables.add(
      this.package.mainModule.findModel.onDidUpdate(this.update)
    )
  }

  recalculate() {
    this.items = []
    if (this.package.mainModule.findModel.editor==this.editor) {
      let markers = this.package.mainModule.findModel.markers
      if (this.threshold && this.threshold<markers.length) { return }
      for (let marker of markers) {
        this.items.push({ row: marker.getScreenRange().start.row, })
      }
    }
  }

}

class NaviLayer extends Layer {

  constructor(editor) {
    super({ editor:editor, name:'navi', timer:20 })
    this.package = atom.packages.getLoadedPackage('navigation-panel')
    this.disposables.add(
      this.package.mainModule.observeHeaders(this.update),
    )
  }

  recalculate() {
    if (!this.package.mainModule.editor || this.package.mainModule.editor.buffer.id!==this.editor.buffer.id) { return }
    this.items = []
    if (!this.package.mainModule.headers) { return }
    let headers = this.package.mainModule.getFlattenHeaders()
    if (this.threshold && this.threshold<headers.length) { return }
    for (let header of headers) {
      this.items.push({ row:this.editor.screenPositionForBufferPosition(header.startPoint).row })
    }
  }

}

function throttle(func, timeout) {
  let timer = false
  return (...args) => {
    if (timer) { return }
    timer = setTimeout(() => {
      func.apply(this, args)
      timer = false
    }, timeout)
  }
}
