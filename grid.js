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

    static #assertPositiveInteger(name, value) {
        if (typeof value !== 'number') {
            throw new TypeError(`${name} must be a number.`);
        }
        if (!Number.isInteger(value) || value <= 0) {
            throw new RangeError(`${name} must be a positive integer.`);
        }
    }

    static #assertCallback(callback) {
        if (callback !== undefined && typeof callback !== 'function') {
            throw new TypeError('onClickCallback must be a function.');
        }
    }

    static #assertParentElement(parentElement) {
        if (
            parentElement === null ||
            parentElement === undefined ||
            typeof parentElement.appendChild !== 'function'
        ) {
            throw new TypeError('parentElement must support appendChild().');
        }
    }

    constructor(rows = 50, columns = 50, squareSize = 20, parentElement, onClickCallback) {
        SquareGrid.#assertPositiveInteger('rows', rows);
        SquareGrid.#assertPositiveInteger('columns', columns);
        SquareGrid.#assertPositiveInteger('squareSize', squareSize);
        SquareGrid.#assertParentElement(parentElement);
        SquareGrid.#assertCallback(onClickCallback);

        if (squareSize < this.#minSize) {
            throw new RangeError(`squareSize must be at least ${this.#minSize}.`);
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
        this.redraw();
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
        SquareGrid.#assertCallback(onClickCallback);
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

    getRows = () => {
        return this.rows;
    }

    getColumns = () => {
        return this.columns;
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
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
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
        this.#checkCellCoordinate('row', row, this.rows);
        this.#checkCellCoordinate('column', column, this.columns);
    }

    #checkCellCoordinate = (name, value, upperBound) => {
        if (typeof value !== 'number') {
            throw new TypeError(`${name} must be a number.`);
        }
        if (!Number.isInteger(value) || value < 0) {
            throw new RangeError(`${name} must be a non-negative integer.`);
        }
        if (value >= upperBound) {
            throw new RangeError(`${name} ${value} is out of bounds [0, ${upperBound}).`);
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
        const { columns, squareSize } = this;
        const displayWidth = canvas.getBoundingClientRect().width;
        const logicalWidth = columns * squareSize + 2;
        const logicalX = x * logicalWidth / displayWidth;
        const column = Math.floor((logicalX - 1) / squareSize);
        return Math.max(0, Math.min(column, columns - 1));
    }

    yToRow = (y) => {
        const canvas = this.#canvas;
        const { rows, squareSize } = this;
        const displayHeight = canvas.getBoundingClientRect().height;
        const logicalHeight = rows * squareSize + 2;
        const logicalY = y * logicalHeight / displayHeight;
        const row = Math.floor((logicalY - 1) / squareSize);
        return Math.max(0, Math.min(row, rows - 1));
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
