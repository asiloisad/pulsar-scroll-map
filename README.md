# scrollmap

Show markers on the scroll bar of text-editor. This is the core package that provides the scrollmap infrastructure. Install layer packages to add markers for different features.

![demo](https://github.com/asiloisad/pulsar-scrollmap/blob/master/assets/demo.png?raw=true)

## Installation

To install `scrollmap` search for [scrollmap](https://web.pulsar-edit.dev/packages/scrollmap) in the Install pane of the Pulsar settings or run `ppm install scrollmap`. Alternatively, you can run `ppm install asiloisad/pulsar-scrollmap` to install a package directly from the GitHub repository.

## Commands

| Command | Description |
|---------|-------------|
| `scrollmap:toggle` | Show layer toggle panel to enable/disable layers |

## API Documentation

The package consumes a `scrollmap` service from other packages to add custom layers.

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
    timer: 100,
    subscribe: (editor, update) => {
      return editor.onDidStopChanging(update);
    },
    recalculate: (editor) => {
      return [
        { row: 10 },                  // basic marker
        { row: 20, cls: "special" },  // with extra class
      ];
    },
  };
}
```

### Provider Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Layer name (CSS class: `marker-{name}`) |
| `description` | string | Layer description shown in toggle panel (optional) |
| `timer` | number | Throttle interval in ms (default: 50) |
| `subscribe` | function | `(editor, update) => Disposable` - set up subscriptions |
| `recalculate` | function | `(editor) => items[]` - return markers to render |

### Marker Item Properties

| Property | Type | Description |
|----------|------|-------------|
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
    { percent: 10, cls: "marker-1", click: () => goTo(1) },
    { percent: 50, cls: "marker-2", click: () => goTo(2) }
  ]);
  container.appendChild(simplemap.element);
  return new Disposable(() => simplemap.destroy());
}
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!
