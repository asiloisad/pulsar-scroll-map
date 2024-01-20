'use babel'
/** @jsx etch.dom */

import { CompositeDisposable, Disposable } from 'atom'
import etch from 'etch'

export default {

  activate () {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => { this.patchEditor(editor) })
    )
    this.cursorMap()
  },

  deactivate () {
    this.disposables.dispose()
  },

  patchEditor(editor) {
    const editorView = editor.getElement()
    const scrollView  = editorView.querySelector('.vertical-scrollbar')
    if (!scrollView) { return }
    editor.scrollMap = new ScrollMap(editor)
    scrollView.parentNode.insertBefore(editor.scrollMap.element, scrollView.nextSibling)
    editor.disposables.add(
      new Disposable(() => { editor.scrollMap.destroy() })
    )
  },

  cursorMap() {
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        let layer = editor.scrollMap.addLayer({ class: 'cursor-item' })

        editor.observeCursors((cursor) => {
          if (!editor.component) { return }
          let screenPosition = cursor.getScreenPosition()
          let editorHeight = editor.component.getScrollHeight()
          let item = {
            row: screenPosition.row,
            top: editor.component.pixelPositionForScreenPosition({
              row: screenPosition.row, column:0 }).top/editorHeight,
          }
          layer.items.push(item)
          editor.scrollMap.update()

          cursor.onDidChangePosition((e) => {
            if (!editor.component) { return }
            let editorHeight = editor.component.getScrollHeight()
            item.row = e.newScreenPosition.row
            item.top = editor.component.pixelPositionForScreenPosition({
              row: e.newScreenPosition.row, column:0 }).top/editorHeight
            editor.scrollMap.update()
          })

          cursor.onDidDestroy(() => {
            layer.items.splice(layer.items.indexOf(item), 1)
            editor.scrollMap.update()
          })

        })
      })
    )
  },

  findMap() {
    let findPackage = atom.packages.getLoadedPackage('find-and-replace')
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => {
        let layer = editor.scrollMap.addLayer({ class: 'find-item' })
        let state = true

        let update = (mode) => {
          layer.items = []
          if (mode && findPackage.mainModule.findModel.editor==editor) {
            let editorHeight = editor.component.getScrollHeight()
            for (let marker of findPackage.mainModule.findModel.markers) {
              let screenRange = marker.getScreenRange()
              layer.items.push({
                row: screenRange.start.row,
                top: editor.component.pixelPositionForScreenPosition({
                  row: screenRange.start.row, column:0 }).top/editorHeight,
              })
            }
          }
          editor.scrollMap.update()
        }

        setTimeout(() => {
          editor.disposables.add(
            findPackage.mainModule.findModel.onDidUpdate(() => {
              if (state) { update(true) }
            }),
            // findPackage.mainModule.findPanel.onDidChangeVisible((visible) => {
            //   update(visible) ; state = visible
            // }),
          )
        })

      })
    )
  },
}

class ScrollMap {

  constructor(editor) {
    this.editor = editor
    this.layers = []
    etch.initialize(this)
  }

  addLayer(props) {
    const layer = { items:[], props:props }
    this.layers.push(layer)
    return layer
  }

  render() {
    let items = []
    for (let layer of this.layers) {
      for (let item of layer.items) {
        let cl = ['scroll-item']
        if (layer.props && layer.props.class) { cl.push(layer.props.class) }
        let on = { click: () => { this.scrollTo(item.row) }}
        let st = `top:${item.top*100}%`
        items.push(<div class={cl.join(' ')} style={st} on={on}/>)
      }
    }
    return <div class='scroll-map'>{items}</div>
  }

  update() {
    etch.update(this)
  }

  async destroy () {
    await etch.destroy(this)
  }

  scrollTo(screenRow) {
    this.editor.scrollToScreenPosition([screenRow, 0], { center: true })
  }
}
