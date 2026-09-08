class SquareGrid {
    #canvas;
    #context;
    #grid;
    #onClickCallback;
    #minSize = 5;
    #defaultColor = "white";
    #gridColor = "black";
    #fillStyle = "default";
    #activeCell = null;
    #activeColor = "orange";
    #alwaysDrawGrid = false;
    #autoRedraw = true;
    #pixelRatioQuery;
    #destroyed = false;

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

    #assertColor = (color) => {
        if (typeof color !== 'string') {
            throw new TypeError('colour must be a CSS colour string');
        }

        const context = this.#context;
        context.save();
        context.fillStyle = '#000000';
        context.fillStyle = color;
        const first = context.fillStyle;

        context.fillStyle = '#ffffff';
        context.fillStyle = color;
        const second = context.fillStyle;

        context.restore();

        if (first !== second) {
            throw new TypeError(`Invalid colour: ${color}`);
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
        canvas.addEventListener('click', this.#onMouseClick);
        this.#canvas = canvas;
        // scale the canvas by window.devicePixelRatio and get scaled context
        this.#context = this.#setPixelDensity();
        this.redraw();
        this.#watchPixelRatio();
    }

    #onPixelRatioChange = () => {
        if (this.#destroyed) {
            return;
        }

        this.#context = this.#setPixelDensity();
        this.redraw();
        this.#watchPixelRatio();
    }

    #watchPixelRatio = () => {
        if (this.#destroyed || typeof window.matchMedia !== 'function') {
            return;
        }

        if (this.#pixelRatioQuery) {
            this.#pixelRatioQuery.removeEventListener('change', this.#onPixelRatioChange);
        }

        const pixelRatio = window.devicePixelRatio || 1;
        this.#pixelRatioQuery = window.matchMedia(`(resolution: ${pixelRatio}dppx)`);
        this.#pixelRatioQuery.addEventListener('change', this.#onPixelRatioChange);
    }

    destroy = () => {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#canvas.removeEventListener('click', this.#onMouseClick);
        this.#pixelRatioQuery?.removeEventListener('change', this.#onPixelRatioChange);
        this.#pixelRatioQuery = undefined;
        this.#onClickCallback = undefined;
    }
    

    #onMouseClick = (event) => {
        const mouseCoords = this.#getMouseCoordinates(event);
        const row = this.#yToRow(mouseCoords.y);
        const column = this.#xToColumn(mouseCoords.x);
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
        this.#assertColor(color);
        this.#checkCellCoords(row, column);
        this.#grid[row][column] = color;
        if (this.#autoRedraw) {
            if (this.#fillStyle === 'default') {
                this.#drawCell(row, column);
            } else {
                // ponytail: full redraw avoids clipped shape artifacts; batch large updates.
                this.redraw();
            }
        }
    }
    
    getCellColor = (row, column) => {
        this.#checkCellCoords(row, column);
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
        if (this.#activeCell?.row === row && this.#activeCell.column === column) {
            this.#drawActiveCell();
        }
    }

    #drawActiveCell = () => {
        if (!this.#activeCell) return;
        const { row, column } = this.#activeCell;
        const context = this.#context;
        const size = this.squareSize;
        const width = Math.min(2, size / 5);
        const inset = 1 + width / 2;
        context.save();
        context.strokeStyle = this.#activeColor;
        context.lineWidth = width;
        context.strokeRect(column * size + 1 + inset, row * size + 1 + inset,
            size - 2 * inset, size - 2 * inset);
        context.restore();
    }

    setActiveCell = (row, column) => {
        this.#checkCellCoords(row, column);
        const previous = this.#activeCell;
        this.#activeCell = { row, column };
        if (this.#autoRedraw) {
            if (previous && this.#fillStyle === 'default') {
                this.#redrawCell(previous.row, previous.column);
            }
            this.#redrawCell(row, column);
        }
    }

    clearActiveCell = () => {
        const previous = this.#activeCell;
        this.#activeCell = null;
        if (previous && this.#autoRedraw) {
            this.#redrawCell(previous.row, previous.column);
        }
    }

    getActiveCell = () => {
        return this.#activeCell ? { ...this.#activeCell } : null;
    }

    setActiveColor = (color) => {
        this.#assertColor(color);
        this.#activeColor = color;
        if (this.#activeCell && this.#autoRedraw) {
            this.#redrawCell(this.#activeCell.row, this.#activeCell.column);
        }
    }

    getActiveColor = () => {
        return this.#activeColor;
    }

    // clear one cell
    clearCell = (row, column) => {
        this.#checkCellCoords(row, column);
        this.#grid[row][column] = 0;
        if (this.#autoRedraw) {
            this.#redrawCell(row, column);
        }
    }

    // Restore a cell and intersecting borders without changing its stored color.
    #redrawCell = (row, column) => {
        if (this.#fillStyle !== 'default') {
            this.redraw();
            return;
        }
        const context = this.#context;
        const size = this.squareSize;
        const transform = context.getTransform();
        const ratio = transform.a;
        // Snap to backing pixels, with a one-pixel margin for antialiased edges.
        const left = Math.floor((column * size + 0.5) * ratio) - 1;
        const top = Math.floor((row * size + 0.5) * ratio) - 1;
        const right = Math.ceil((column * size + size + 1.5) * ratio) + 1;
        const bottom = Math.ceil((row * size + size + 1.5) * ratio) + 1;

        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.beginPath();
        context.rect(left, top, right - left, bottom - top);
        context.clip();
        context.clearRect(left, top, right - left, bottom - top);
        context.fillStyle = this.#defaultColor;
        context.fillRect(left, top, right - left, bottom - top);
        context.setTransform(transform);

        // Restore intersecting cells in the same order as redraw(), including corners.
        const firstRow = Math.max(0, Math.floor((top / ratio - 1.5) / size));
        const lastRow = Math.min(this.rows - 1, Math.floor((bottom / ratio - 0.5) / size));
        const firstColumn = Math.max(0, Math.floor((left / ratio - 1.5) / size));
        const lastColumn = Math.min(this.columns - 1, Math.floor((right / ratio - 0.5) / size));
        for (let r = firstRow; r <= lastRow; r++) {
            for (let c = firstColumn; c <= lastColumn; c++) {
                if (this.#grid[r][c]) {
                    this.#fillCell(r, c);
                }
                this.#strokeCell(r, c);
            }
        }
        this.#drawActiveCell();
        context.restore();
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
        const x = column * squareSize + 1;
        const y = row * squareSize + 1;
        if (this.#fillStyle === 'default') {
            context.fillRect(x, y, squareSize, squareSize);
            return;
        }

        const centerX = x + squareSize / 2;
        const centerY = y + squareSize / 2;
        const radius = squareSize / 2 - Math.max(1, squareSize * 0.1);
        context.beginPath();
        if (this.#fillStyle === 'circle') {
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        } else {
            context.moveTo(centerX, centerY - radius);
            context.lineTo(centerX + radius, centerY);
            context.lineTo(centerX, centerY + radius);
            context.lineTo(centerX - radius, centerY);
            context.closePath();
        }
        context.fill();
    }
    
    // draw the border around the cell
    #strokeCell = (row, column) => {
        const gridColor = this.#gridColor;
        if (!gridColor) { // do not draw borders if no color is specified
            return; 
        }

        const grid = this.#grid;
        
        if (grid[row][column] || this.#alwaysDrawGrid) {
            this.#strokeCellWithColor(row, column, gridColor);
        }
    }
    
    #strokeCellWithColor = (row, column, color) => {
        const context = this.#context;
        const { squareSize } = this;

        context.strokeStyle = color;
        context.lineWidth = 1;
        context.strokeRect(column * squareSize + 1, row * squareSize + 1, squareSize, squareSize);        
    }
    
    // redraw all cells in the grid
    redraw = () => {
        // fill the canvas with default color
        const canvas = this.#canvas;
        const context = this.#context;
        // Fill every backing pixel, including rounding at fractional pixel ratios.
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = this.#defaultColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();
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
        this.#drawActiveCell();
    }

    // check that the cell coordinates are in bounds
    #checkCellCoords = (row, column) => {
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
    #setPixelDensity = () => {
        const canvas = this.#canvas;
        const { rows, columns, squareSize } = this;
        const pixelRatio = window.devicePixelRatio || 1;
        const logicalWidth = columns * squareSize + 2;
        const logicalHeight = rows * squareSize + 2;

        // Keep the display dimensions stable and round the backing store up so
        // fractional pixel ratios cannot clip the rightmost or bottom strokes.
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;
        canvas.width = Math.ceil(logicalWidth * pixelRatio);
        canvas.height = Math.ceil(logicalHeight * pixelRatio);

        const cxt = canvas.getContext('2d');
        cxt.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        return cxt;
    }

    #getMouseCoordinates = (event) => {
        const canvas = this.#canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    #xToColumn = (x) => {
        const canvas = this.#canvas;
        const { columns, squareSize } = this;
        const displayWidth = canvas.getBoundingClientRect().width;
        const logicalWidth = columns * squareSize + 2;
        const logicalX = x * logicalWidth / displayWidth;
        const column = Math.floor((logicalX - 1) / squareSize);
        return Math.max(0, Math.min(column, columns - 1));
    }

    #yToRow = (y) => {
        const canvas = this.#canvas;
        const { rows, squareSize } = this;
        const displayHeight = canvas.getBoundingClientRect().height;
        const logicalHeight = rows * squareSize + 2;
        const logicalY = y * logicalHeight / displayHeight;
        const row = Math.floor((logicalY - 1) / squareSize);
        return Math.max(0, Math.min(row, rows - 1));
    }
    
    setFillStyle = (style) => {
        if (typeof style !== 'string') {
            throw new TypeError('fill style must be a string.');
        }
        if (!['default', 'diamond', 'circle'].includes(style)) {
            throw new RangeError('fill style must be default, diamond, or circle.');
        }
        this.#fillStyle = style;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }

    getFillStyle = () => {
        return this.#fillStyle;
    }

    setDefaultColor = (color) => {
        this.#assertColor(color);
        this.#defaultColor = color;
        if (this.#autoRedraw) {
            this.redraw();
        }
    }
    getDefaultColor = () => {
        return this.#defaultColor;
    }
    setGridColor = (color) => {
        if (color) {
            this.#assertColor(color);
        }
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
