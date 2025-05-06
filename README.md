# Chaos Equation Visualizer

A web-based interactive visualization of mathematical chaos equations, inspired by CodeParade's "Chaos Equations" concept. This project brings to life the complex and beautiful patterns that emerge from simple mathematical rules applied iteratively.

![Chaos Equation Visualization](https://i.imgur.com/demo.png)

## Features

- Interactive chaos equation visualization in the browser
- Full control over equation parameters
- Real-time animation with adjustable speed
- Save and load interesting patterns via equation codes
- Pan and zoom to explore intricate details
- Multiple visualization styles with different trail and dot settings

## How It Works

The visualization is based on a system of two coupled equations:

```
x' = f(x, y, t)
y' = g(x, y, t)
```

For each time value `t`, a point starting at `(t, t)` is iterated through the equations hundreds of times. Each iteration is plotted with a unique color, creating beautiful patterns as `t` changes.

The equations use combinations of these terms: x², y², t², xy, xt, yt, x, y, and t.

## Beautiful Equation Codes

Try these equation codes for some stunning visuals:

- `LDNMGQ` - Spiral galaxy formation
- `HELPME` - Chaotic attractor with swirling tendrils
- `I_CNJJ` - Fractal-like nested structures
- `UFHUBR` - Symmetric butterfly pattern
- `YAXVBB` - Dynamic wave interference pattern

To use these codes, enter them in the "Equation Code" field and click "Load Code".

## Controls

### Button Controls
- **Start** - Begin the animation
- **Stop** - Pause the animation
- **Clear** - Reset the visualization
- **Apply** - Apply changes to the equations
- **Randomize** - Generate random equations
- **Load Code** - Load an equation from its code
- **Center** - Center the view on the current pattern

### Keyboard Controls
- **A** - Automatic mode (randomize equations when finished)
- **R** - Repeat mode (keep same equation)
- **C** - Center points
- **D** - Toggle dot size (small, medium, large)
- **I** - Toggle iteration limit
- **T** - Toggle trail type (fade speeds)
- **P** - Pause/Resume
- **Space** - Reverse direction
- **N** - New random equation

### Mouse Controls
- **Drag** - Pan the view
- **Scroll** - Zoom in/out

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Click "Start" to begin the visualization
4. Experiment with different equation codes and settings

## License

This project is open source and available under the MIT License.
