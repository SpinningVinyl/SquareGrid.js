class SquareGrid {
    #canvas;
    #context;
    #grid;
    #onClickCallback;
    #minSize = 5;
    #defaultColor = "white";
    #gridColor = "black";
    #alwaysDrawGrid = false;
    #autoRedraw = true;

    constructor(rows = 50, columns = 50, squareSize = 20, parentElement, onClickCallback) {
        if (rows < 1 || columns < 1) {
            throw new Error('Number of rows and columns should be equal to or greater than 1.');
        }
        if (!parentElement) {
            throw new Error('Parent element not provided.')
        }
        if (squareSize < this.#minSize) {
            throw new Error(`Requested square size (${squareSize}) less than the minimum allowed size (${this.#minSize}).`);
        }
        // cell size and the dimensions of the grid are read only properties
        Object.defineProperties(this, {
            rows: {
                value: rows,
                writable: false
            },
            columns: {
                value: columns,
                writable: false
            },
            squareSize: {
                value: squareSize,
                writable: false
            }
        });
        if (onClickCallback) {
            this.#onClickCallback = onClickCallback;
        }
        // initialize the array holding the grid data
        this.#grid = new Array(rows)
            .fill(null)
            .map(() => new Array(columns)
                 .fill(0));

        // create the canvas
        const canvas = document.createElement('canvas');
        canvas.classList.add('squareGrid');
        canvas.setAttribute('width', columns * squareSize + 2);
        canvas.setAttribute('height', rows * squareSize + 2);
        parentElement.appendChild(canvas);
        canvas.addEventListener('click', this.onMouseClick);
        this.#canvas = canvas;
        // scale the canvas by window.devicePixelRatio and get scaled context
        this.#context = this.setPixelDensity();
    }
    

    onMouseClick = (event) => {
        const mouseCoords = this.getMouseCoordinates(event);
        const row = this.yToRow(mouseCoords.y);
        const column = this.xToColumn(mouseCoords.x);
        // console.log(`row ${row}, column ${column}`);
        if (this.#onClickCallback) {
            this.#onClickCallback(row, column, event);
        }
    }

    setOnClickCallback = (onClickCallback) => {
        this.#onClickCallback = onClickCallback;
    }
    
    setCellColor = (row, column, color) => {
        this.checkCellCoords(row, column);
        this.#grid[row][column] = color;
        if (this.#autoRedraw) {
            this.#drawCell(row, column);
        }
    }
    
    getCellColor = (row, column) => {
        this.checkCellCoords(row, column);
        const grid = this.#grid;
        return grid[row][column] ? grid[row][column] : this.#defaultColor;
    }

    // draw one individiual cell
    #drawCell = (row, column) => {
        this.#fillCell(row, column);
        this.#strokeCell(row, column);
    }
    
    // clear one cell
    clearCell = (row, column) => {
        this.checkCellCoords(row, column);
        this.#grid[row][column] = 0;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }

    // clear all cells in a grid
    clearGrid = () => {
        const grid = this.#grid;
        const { rows, columns } = this;
        for (let row = 0; i < rows; i++) {
            for (let column = 0; i < columns; i++) {
                grid[row][column] = 0;
            }
        }
        if (this.#autoRedraw) {
            this.redraw();
        }
    }

    // fill one individual cell
    #fillCell = (row, column) => {
        const { squareSize } = this;
        const grid = this.#grid;
        const context = this.#context;
        const defaultColor = this.#defaultColor;
        if (grid[row][column]) {
            context.fillStyle = grid[row][column];
        } else {
            context.fillStyle = defaultColor;
        }
        context.fillRect(column * squareSize + 1, row * squareSize + 1, squareSize, squareSize);
    }
    
    // draw the border around the cell
    #strokeCell = (row, column) => {
        const gridColor = this.#gridColor;
        if (!gridColor) { // do not draw borders if no color is specified
            return; 
        }
        
        const grid = this.#grid;
        const context = this.#context;
        const { squareSize } = this;

        context.strokeStyle = gridColor;
        context.lineWidth = 1;
        if (grid[row][column] || this.#alwaysDrawGrid) {
            context.strokeRect(column * squareSize + 1, row * squareSize + 1, squareSize, squareSize);
        }
    }
    
    // redraw all cells in the grid
    redraw = () => {
        // fill the canvas with default color
        const canvas = this.#canvas;
        const context = this.#context;
        context.fillStyle = this.#defaultColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        // draw visible cells
        const grid = this.#grid;
        grid.forEach((row, rowIdx) => {
            row.forEach((cellColor, columnIdx) => {
                if (cellColor) {
                    this.#fillCell(rowIdx, columnIdx);
                }
                this.#strokeCell(rowIdx, columnIdx);
            });
        });
    }

    // check that the cell coordinates are in bounds
    checkCellCoords = (row, column) => {
        const { rows, columns } = this;
        if (row < 0 || row >= rows) {
            throw new Error(`Row ${row} out of bounds [0, ${rows}).`);
        }
        if (column < 0 || column >= columns) {
            throw new Error(`Column ${column} out of bounds [0, ${columns}).`);
        }
    }

    // HiDPI-ready canvas, oh yeah
    setPixelDensity = () => {
        const canvas = this.#canvas;
        let pixelRatio = window.devicePixelRatio; // get pixel ratio of the browser window
        const actualSize = canvas.getBoundingClientRect(); // get the actual size of the canvas
        // multiply the canvas size by the pixel ratio
        canvas.width = actualSize.width * pixelRatio;
        canvas.height = actualSize.height * pixelRatio;
        // shrink the display size back down by the pixel ratio == pin-sharp images even on scaled displays
        canvas.style.width = `${canvas.width / pixelRatio}px`;
        canvas.style.height = `${canvas.height / pixelRatio}px`;
        const cxt = canvas.getContext('2d');
        // scale the context to make sure that we can draw on it "as before"
        cxt.scale(pixelRatio, pixelRatio);
        return cxt;
    }

    getMouseCoordinates = (event) => {
        const canvas = this.#canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    xToColumn = (x) => {
        const canvas = this.#canvas;
        const { columns } = this;
        const columnWidth = canvas.getBoundingClientRect().width / columns;
        const column = Math.floor(x / columnWidth);
        return Math.min(column, columns);
    }

    yToRow = (y) => {
        const canvas = this.#canvas;
        const { rows } = this;
        const rowHeight = canvas.getBoundingClientRect().height / rows;
        const row = Math.floor(y / rowHeight);
        return Math.min(row, rows);
    }
    
    setDefaultColor = (color) => {
        this.#defaultColor = color;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }
    getDefaultColor = () => {
        return this.#defaultColor;
    }
    setGridColor = (color) => {
        this.#gridColor = color;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }
    getGridColor = () => {
        return this.#gridColor;
    }
    setAlwaysDrawGrid = (b) => {
        this.#alwaysDrawGrid = b;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }
    getAlwaysDrawGrid = () => {
        return this.#alwaysDrawGrid;
    }
    
    setAutoRedraw = (b) => {
        this.#autoRedraw = b;
    }
    
    getAutoRedraw = () => {
        return this.#autoRedraw;
    }

}
