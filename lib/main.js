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
            if (atom.workspace.isTextEditor(item)) { item.scrollmap.update() }
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

  scrollTo(screenRow) {
    this.editor.scrollToScreenPosition([screenRow, 0], { center:true })
  }

  render() {
    const items = []
    if (this.editor.component) {
      let editorHeight = this.editor.component.getScrollHeight()
      if (editorHeight!==0) {
        for (let [name, layer] of Object.entries(this.layers)) {
          for (let item of layer.items) {
            let c = `scroll-item ${name}-layer`
            let s = `top:${this.editor.component.pixelPositionForScreenPosition({
              row: item.row, column:0 }).top/editorHeight*100}%`
              let o = { click:() => this.scrollTo(item.row) }
              items.push(<div class={c} style={s} on={o}/>)
          }
        }
      }
    }
    return <div class='scroll-map'>{items}</div>
  }

  update() {
    for (let name in this.layers) { this.layers[name].update() }
    etch.update(this)
  }

  destroy () {
    for (let name in this.layers) { this.layers[name].destroy() }
    etch.destroy(this)
  }
}

class CursorLayer {

    constructor(editor) {
      this.disposables = new CompositeDisposable()
      this.disposables.add(atom.config.observe('scroll-map.cursorLayer.threshold', (value) => {
        this.threshold = value
      }))
      this.editor = editor
      this.items = []
      const render = throttle(() => { this.update() ; etch.update(this.editor.scrollmap) }, 10)
      this.subscribe1 = this.editor.observeCursors(render)
      this.subscribe2 = this.editor.onDidRemoveCursor(render)
      this.subscribe3 = this.editor.onDidChangeCursorPosition(render)
    }

    update() {
      this.items = []
      if (!this.editor.component) { return }
      let cursors = this.editor.getCursors()
      if (this.threshold && this.threshold<cursors.length) { return }
      for (let cursor of this.editor.getCursors()) {
        this.items.push({ row: cursor.getScreenPosition().row })
      }
    }

    destroy() {
      this.disposables.dispose()
      this.items = []
      this.subscribe1.dispose()
      this.subscribe2.dispose()
      this.subscribe3.dispose()
    }
}

class FindLayer {

  constructor(editor) {
    this.disposables = new CompositeDisposable()
    this.disposables.add(atom.config.observe('scroll-map.findLayer.threshold', (value) => {
      this.threshold = value
    }))
    this.editor = editor
    this.items = []
    this.package = atom.packages.getLoadedPackage('find-and-replace')
    const render = throttle(() => { this.update() ; etch.update(this.editor.scrollmap) }, 10)
    this.subscribe = this.package.mainModule.findModel.onDidUpdate(render)
  }

  update() {
    this.items = []
    if (!this.package) { return }
    if (this.package.mainModule.findModel.editor==this.editor) {
      let markers = this.package.mainModule.findModel.markers
      if (this.threshold && this.threshold<markers.length) { return }
      for (let marker of markers) {
        this.items.push({ row: marker.getScreenRange().start.row, })
      }
    }
  }

  destroy() {
    this.disposables.dispose()
    this.items = []
    this.subscribe.dispose()
  }
}

class NaviLayer {

  constructor(editor) {
    this.disposables = new CompositeDisposable()
    this.disposables.add(atom.config.observe('scroll-map.naviLayer.threshold', (value) => {
      this.threshold = value
    }))
    this.editor = editor
    this.items = []
    this.package = atom.packages.getLoadedPackage('navigation-panel')
    const render = throttle(() => { this.update() ; etch.update(this.editor.scrollmap) }, 10)
    this.subscribe = this.package.mainModule.observeHeaders(render)
  }

  update() {
    this.items = []
    if ((!this.package)||(!this.package.mainModule.headers)) { return }
    let headers = this.package.mainModule.getFlattenHeaders()
    if (this.threshold && this.threshold<headers.length) { return }
    for (let header of headers) {
      this.items.push({ row:this.editor.screenPositionForBufferPosition(header.startPoint).row })
    }
  }

  destroy() {
    this.disposables.dispose()
    this.items = []
    this.subscribe.dispose()
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
