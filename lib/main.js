'use babel'
/** @jsx etch.dom */

const { CompositeDisposable, Disposable } = require('atom')
const etch = require('etch')

module.exports = {

  config: {
    cursorLayer: {
      order: 1,
      title: 'Show markers of cursors position',
      description: 'Restart needed',
      type: 'boolean',
      default: true,
    },
    findLayer: {
      order: 2,
      title: 'Show markers of find-and-replace search results',
      description: '[find-and-replace](https://github.com/pulsar-edit/pulsar/tree/master/packages/find-and-replace) required. Restart needed',
      type: 'boolean',
      default: true,
    },
    naviLayer: {
      order: 3,
      title: 'Show markers of navigation-panel headers',
      description: '[navigation-panel](https://github.com/bacadra/pulsar-navigation-panel) required. Restart needed',
      type: 'boolean',
      default: true,
    },
  },

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
    if (atom.config.get('scroll-map.cursorLayer')) {
      this.registerLayer('cursor', CursorLayer)
    } else {
      this.unregisterLayer('cursor')
    }
  },

  findLayer() {
    if (atom.config.get('scroll-map.findLayer')) {
      this.registerLayer('find', FindLayer)
    } else {
      this.unregisterLayer('find')
    }
  },

  naviLayer() {
    if (atom.config.get('scroll-map.naviLayer')) {
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
      for (let cursor of this.editor.getCursors()) {
        this.items.push({ row: cursor.getScreenPosition().row })
      }
    }

    destroy() {
      this.items = []
      this.subscribe1.dispose()
      this.subscribe2.dispose()
      this.subscribe3.dispose()
    }
}

class FindLayer {

  constructor(editor) {
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
      for (let marker of this.package.mainModule.findModel.markers) {
        this.items.push({ row: marker.getScreenRange().start.row, })
      }
    }
  }

  destroy() {
    this.items = []
    this.subscribe.dispose()
  }
}

class NaviLayer {

  constructor(editor) {
    this.editor = editor
    this.items = []
    this.package = atom.packages.getLoadedPackage('navigation-panel')
    const render = throttle(() => { this.update() ; etch.update(this.editor.scrollmap) }, 10)
    this.subscribe = this.package.mainModule.observeHeaders(render)
  }

  update() {
    this.items = []
    if ((!this.package)||(!this.package.mainModule.headers)) { return }
    for (let header of this.package.mainModule.getFlattenHeaders()) {
      this.items.push({ row:this.editor.screenPositionForBufferPosition(header.startPoint).row })
    }
  }

  destroy() {
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
