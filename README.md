# SquareGrid.js

A small JS library for drawing and manipulating a grid of squares. Could be used to implement simple games (e.g. Tetris, Snake or Conway's game of life), visualise pathfinding algorithms, etc.

## Features

- clean JS with no external dependencies
- support for HiDPI displays

## Usage

### Create a new grid

```
const myGrid = new SquareGrid(rows, columns, squareSize, parentElement, onClickCallback);
```

The constructor accepts the following parameters:

- `rows` -- number of rows in the grid;
- `columns` -- number of columns in the grid;
- `squareSize` -- width and height of one cell (in pixels);
- `parentElement` -- the element which the canvas will be appended to;
- `onClickCallback` -- the function that will be called when the user clicks on the grid.

### Set the default colour

```
myGrid.setDefaultColor(color);
```

The default colour is used as the background colour, and also for any cells that don't have the colour set explicitly.

### Set the color of a cell

```
myGrid.setCellColor(row, column, color);
```

For example, the following snippet would change the colour of a cell with the coordinates (5,5) randomly:

```
function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
}

myGrid.setCellColor(5, 5, getRandomColor());
```

### Get the colour of a cell

```
const myCellColor = myGrid.getCellColor(row, column);
```

If the cell in question does not have a set colour, the function will return the default colour.

### Get the default colour

```
const myDefaultColor = myGrid.getDefaultColor();
```

### Clear a cell

```
myGrid.clearCell(row, column);
```

### Clear all cells in the grid

```
myGrid.clearGrid();
```

### Set the color of the grid

```
myGrid.setGridColor(color);
```

Set the grid color to `false`, `0`, or any other falsy value to turn off the grid.

### Enable or disable outlines around empty cells

By default, **SquareGrid.js** draws outlines only around those cells that have their colour set explicitly. If you want to also draw outlines around empty cells, use the `setAlwaysDrawGrid()` method:

```
myGrid.setAlwaysDrawGrid(true)
```

Use the `getAlwaysDrawGrid()` method to check whether this functionality is currently enabled.

### Automatic redraws

By default, **SquareGrid.js** automatically redraws the canvas when you make changes to the grid (i.e. after setting or clearing the colour of any cell, changing the default colour or the grid colour).

It is possible to disable automatic redraws as following:

```
myGrid.setAutoRedraw(false);
```

To enable automatic redraws:

```
myGrid.setAutoRedraw(true);
```

To get the status of the automatic redraws:

```
const isAutoRedrawEnabled = myGrid.getAutoRedraw();
```

### Redraw the grid manually

To redraw the canvas manually:

```
myGrid.redraw();
```

### On click callback

The internal click listener calls the provided `onClickCallback` function with the following parameters:

- `row` and `column` -- the coordinates of the cell that has been clicked;
- `event` -- the click event object.

## Example

Please see the provided `example.html` file.
