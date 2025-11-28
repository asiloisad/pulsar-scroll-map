# scroll-map

Show markers on the scroll bar of text-editor. The build-in layer are designed to create markers of cursors position, find-and-replace results, navigation-panel headers and linter items. The style of the markers is adjusted for one-light and one-dark themes. Markers work like hyperlinks. If layer markers threshold is exceed, then layer markers are turn off.

![context-menu](https://github.com/asiloisad/pulsar-scroll-map/blob/master/assets/demo.png?raw=true)

## Installation

To install `scroll-map` search for [scroll-map](https://web.pulsar-edit.dev/packages/scroll-map) in the Install pane of the Pulsar settings or run `ppm install scroll-map`. Alternatively, you can run `ppm install asiloisad/pulsar-scroll-map` to install a package directly from the GitHub repository.

## Customize the appearance

Markers can be customized to meet the user's needs. The customization file `styles.less` can be opened by menu bar `File/Stylesheet...` or by command `application:open-your-stylesheet`.

- e.g. change color of cursors markers:
  ```less
  .scroll-map .scroll-item.cursor-layer {
    background-color: red;
  }
  ```

- e.g. change color of find-and-replace markers:
  ```less
  .scroll-map .scroll-item.find-layer {
    background-color: red;
  }
  ```

- e.g. change color of navigation-panel markers:
  ```less
  .scroll-map .scroll-item.navi-layer {
    background-color: red;
  }
  ```

- e.g. change height of all markers:
  ```less
  .scroll-map .scroll-item {
    height: 5px !important;
  }
  ```

- e.g. change width of markers:
  ```less
  .scroll-map .scroll-item {
    width: 10px;
  }
  ```

- e.g. fit scroll-marker width to scroll-bar width (default is 10px):
  ```less
  .scroll-map {
    width: 15px;
  }
  ```

## PDF Viewer Integration

The package integrates with [pdf-viewer](https://github.com/asiloisad/pulsar-pdf-viewer) to display document outline markers on the scroll bar. When viewing a PDF with an outline (table of contents), markers are displayed for each heading level:

- **H1** headers use `@ui-site-color-1`
- **H2** headers use `@ui-site-color-2`
- **H3** headers use `@ui-site-color-3`
- **H4** headers use `@ui-site-color-4`
- **H5/H6** headers use `@ui-site-color-5`

Clicking on a marker navigates to that section in the PDF. The current visible section is highlighted with `@text-color-highlight`.

To customize PDF markers:
```less
.scroll-map .scroll-item.pdf-h1 {
  background-color: red;
}
```

## API Documentation

The package provides a service for other packages to create custom scroll maps:

```javascript
// In your package.json consumedServices:
"consumedServices": {
  "scroll-map": {
    "versions": {
      "0.0.1": "consumeScrollMap"
    }
  }
}

// In your main module:
consumeScrollMap(service) {
  // Register a custom layer for text editors
  service.registerLayer("myLayer", MyLayerClass);

  // Or create a simple scroll-map for non-editor panes
  const scrollMap = new service.ScrollMapSimple();
  scrollMap.setItems([
    { percent: 25, cls: "my-marker", click: () => console.log("clicked") }
  ]);

  return new Disposable(() => {
    service.unregisterLayer("myLayer");
    scrollMap.destroy();
  });
}
```

### Layer Base Class

For text editor layers, extend the `Layer` base class provided by the service:

```javascript
class MyLayer extends service.Layer {
  constructor(editor) {
    super({ editor, name: "myname", timer: 50 });
    // Subscribe to events that should trigger updates
    this.disposables.add(
      editor.onDidStopChanging(this.update)
    );
  }

  // Override recalculate() to compute marker positions
  recalculate() {
    this.items = [];
    // Add items with row numbers
    this.items.push({ row: 10 });
    // Optionally add extra CSS classes
    this.items.push({ row: 20, cls: "special" });
  }
}
```

The Layer class provides:
- `this.editor` - The text editor instance
- `this.name` - Layer name (used for CSS class `{name}-layer`)
- `this.items` - Array of marker items to render
- `this.threshold` - Config-based threshold for max items
- `this.update()` - Throttled method to trigger recalculation
- `this.disposables` - CompositeDisposable for cleanup

Each item in `this.items` should have:
- `row` - Screen row number for the marker
- `cls` - (optional) Additional CSS class(es)

### ScrollMapSimple

For non-editor panes (like PDF viewer), use `ScrollMapSimple`:

```javascript
const scrollMap = new service.ScrollMapSimple();

// Set markers with percentage positions
scrollMap.setItems([
  { percent: 10, cls: "header-1", click: () => goToSection(1) },
  { percent: 50, cls: "header-2", click: () => goToSection(2) }
]);

// Insert into DOM
container.appendChild(scrollMap.element);

// Clean up when done
scrollMap.destroy();
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!
