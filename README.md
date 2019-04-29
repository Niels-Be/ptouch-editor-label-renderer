# Brother PTouch Editor Label Renderer

This project lets you render and print labels created with the official Brother PTouch Editor.
The label is fully rendered in the Browser and only the resulting image is send to the backend to print.
It uses [brother_ql](https://github.com/pklaus/brother_ql) to send the image to the printer.

The website is only a PoC to demonstrate the rendering capabilities.
You can embed the render into your own project. e.g. to automatically print labels with fields filled from a database.

## Features
*Note: not everything is implemented, so resulting images might differ from the original*

Supported features:
- Text (only global styling)
- Barcode (only EAN13)
- Tables
- Images (only binary with transparency)
- Rectangles (only symmetrically rounded corners)
- Polygons (only LINE mode)
- Database Fields

## Usage

#### As standalone
```
pip install -r .
python backend.py
```

CLI Options:
```
  --host TEXT     Host / IP to listen on
  --port INTEGER  Port to listen on
  --model TEXT    brother_ql model
  --backend TEXT  brother_ql backend
  --printer TEXT  brother_ql printer
  --debug         Enable verbose debugging output
  --help          Show this message and exit.
```

#### As a library
Copy `renderer.js` into your project.

Example usage:
```js
const canvas = document.getElementById('canvas');
const renderer = new PTouchRenderer(canvas);
async function handleFileSelect(evt) {
    const file = evt.target.files[0];
    // open the file and render
    await renderer.open(file);
    await renderer.render();
}
document.getElementById('file').addEventListener('change', handleFileSelect, false);
```


## Contribution

If a feature is missing feel free to open a Issue or a PR, I am happy to include it.


## Thanks

Backend was mostly copied from [label_api](https://github.com/pklaus/label_api). So thanks to @pklaus for sharing this
