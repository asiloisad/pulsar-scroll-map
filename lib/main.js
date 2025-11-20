/** @babel */
/** @jsx etch.dom */

const { CompositeDisposable, Disposable } = require('atom')
const etch = require('etch')

module.exports = {

  activate() {
    this.layers = {} // list of classes
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
    this.layers = {}
    this.disposables.dispose()
  },

  patchEditor(editor) {
    const editorView = editor.getElement()
    if (!editorView) { return }
    const scrollView = editorView.querySelector('.vertical-scrollbar')
    if (!scrollView) { return }
    editor.scrollmap = new ScrollMap(editor)
    for (const [name, Layer] of Object.entries(this.layers)) {
      editor.scrollmap.addLayer(name, Layer)
    }
    let disposable = new Disposable(() => { editor.scrollmap.destroy() })
    editor.disposables.add(disposable) ; this.disposables.add(disposable)
    scrollView.parentNode.insertBefore(editor.scrollmap.element, scrollView.nextSibling)
  },

  registerLayer(name, Layer) {
    if (name in this.layers) { return }
    this.layers[name] = Layer
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.addLayer(name, Layer)
    }
  },

  unregisterLayer(name) {
    if (!(name in this.layers)) { return }
    delete this.layers[name]
    for (let editor of atom.workspace.getTextEditors()) {
      editor.scrollmap.delLayer(name)
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

  linterLayer() {
    if (atom.config.get('scroll-map.linterLayer.state')) {
      this.registerLayer('linter', LinterLayer)
    } else {
      this.unregisterLayer('linter')
    }
    return {
      name: 'scroll-map',
      render(args) {
        atom.workspace.getTextEditors().map(editor =>
          editor.scrollmap.layers['linter'].filter(args)
        )
      },
      didBeginLinting() {},
      didFinishLinting() {},
      dispose() {},
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
      const pixelPos = this.editor.component.pixelPositionAfterBlocksForRow(item.row)
      item.c = `scroll-item ${this.name}-layer`
      if (item.cls) { item.c += ` ${item.cls}` }
      item.s = `top:${pixelPos/editorHeight*100}%`
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
      super({ editor:editor, name:'cursor', timer:50 })
      this.disposables.add(
        this.editor.observeCursors(this.update),
        this.editor.onDidRemoveCursor(this.update),
        this.editor.onDidChangeCursorPosition(this.update),
      )
    }

    recalculate() {
      this.items = []
      if (!this.editor.component) { return }
      let positions = this.editor.getCursorScreenPositions()
      if (this.threshold && this.threshold<positions.length) { return }
      this.items = positions.map((position) => { return { row:position.row }})
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
    super({ editor:editor, name:'navi', timer:50 })
    this.package = atom.packages.getLoadedPackage('navigation-panel')
    this.disposables.add(
      this.package.mainModule.observeHeaders(this.update),
    )
  }

  recalculate() {
    if (!this.package.mainModule.editor || !this.package.mainModule.editor.buffer || this.package.mainModule.editor.buffer.id!==this.editor.buffer.id) { return }
    this.items = []
    if (!this.package.mainModule.headers) { return }
    let headers = this.package.mainModule.getFlattenHeaders()
    if (this.threshold && this.threshold<headers.length) { return }
    for (let header of headers) {
      this.items.push({ row:this.editor.screenPositionForBufferPosition(header.startPoint).row })
    }
  }
}

class LinterLayer extends Layer {

  constructor(editor) {
    super({ editor:editor, name:'linter', timer:50 })
    this.messages = [] // init
  }

  filter({ added, messages, removed }) {
    let editorPath = this.editor.getPath()
    let updateRequired = false
    if (added.filter(item => item.location.file===editorPath).length) {
      updateRequired = true
    } else if (removed.filter(item => item.location.file===editorPath).length) {
      updateRequired = true
    }
    if (updateRequired) {
      this.messages = messages.filter(item => item.location.file===editorPath)
      this.update()
    }
  }

  recalculate() {
    this.items = this.messages.map((message) => { return {
      row: this.editor.screenPositionForBufferPosition(message.location.position.start).row,
      cls: message.severity,
    }})
  }
}

function throttle(func, timeout) {
  let timer = false
  return (...args) => {
    if (timer) { return }
    timer = setTimeout(() => {
      func.apply(this, args)
      timer = false
    })
  }
}
