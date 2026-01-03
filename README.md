# scrollmap

Show markers on the scroll bar. Core package providing scrollmap infrastructure for text editors and custom panes.

![demo](https://github.com/asiloisad/pulsar-scrollmap/blob/master/assets/demo.png?raw=true)

## Features

- **Layer system**: Multiple packages can add markers to the scrollbar.
- **Toggle panel**: Enable/disable layers individually.
- **Simplemap API**: Support for non-editor panes like PDF viewer.
- **Extensible**: Other packages provide layers via the `scrollmap` service.

## Installation

To install `scrollmap` search for [scrollmap](https://web.pulsar-edit.dev/packages/scrollmap) in the Install pane of the Pulsar settings or run `ppm install scrollmap`. Alternatively, you can run `ppm install asiloisad/pulsar-scrollmap` to install a package directly from the GitHub repository.

## Service

The package provides a `scrollmap` service for other packages to add custom layers.

### Providing a Layer

```javascript
// In package.json:
"providedServices": {
  "scrollmap": {
    "versions": { "1.0.0": "provideScrollmap" }
  }
}

// In your main module:
provideScrollmap() {
  return {
    name: "mylayer",
    description: "My layer description",
    position: "left",
    initialize: ({ editor, disposables, update }) => {
      disposables.add(
        editor.onDidStopChanging(update),
      );
    },
    getItems: ({ editor }) => {
      return [
        { row: 10 },                  // basic marker
        { row: 20, cls: "special" },  // with extra class
      ];
    },
  };
}
```

### Provider properties

| Property | Type | Description |
| --- | --- | --- |
| `name` | string | Layer name (CSS class: `marker-{name}`) |
| `description` | string | Layer description shown in toggle panel (optional) |
| `position` | string | Position class e.g. `left`, `right` (optional) |
| `timer` | number | Throttle interval in ms (default: 50) |
| `initialize` | function | `({ editor, cache, disposables, update }) => void` - set up layer |
| `getItems` | function | `({ editor, cache }) => items[]` - return markers to render |

### Marker item properties

| Property | Type | Description |
| --- | --- | --- |
| `row` | number | Screen row for the marker |
| `cls` | string | Additional CSS class (optional) |

### Simplemap for Non-Editor Panes

For custom panes (like PDF viewer), consume the `simplemap` service:

```javascript
// In package.json:
"consumedServices": {
  "simplemap": {
    "versions": { "1.0.0": "consumeSimplemap" }
  }
}

// In your main module:
consumeSimplemap(Simplemap) {
  const simplemap = new Simplemap();
  simplemap.setItems([
    { percent: 10, cls: "marker-h1" },
    { percent: 50, cls: "marker-h2" },
  ]);
  container.appendChild(simplemap.element);
  return new Disposable(() => simplemap.destroy());
}
```

## Customization

The style can be adjusted according to user preferences in the `styles.less` file:

- e.g. change marker width and opacity:

```less
.scrollmap .marker {
  width: 6px;
  opacity: 0.8;
}
```

- e.g. style specific layers:

```less
.scrollmap .marker-mylayer {
  background-color: @text-color-info;
}
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!
