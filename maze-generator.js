class MazeGenerator {
    constructor(size = 20, complexity = 0.75, density = 0.75) {
        this.size = size;
        this.complexity = complexity;
        this.density = density;
    }

    generate() {
        // Initialize maze grid
        const shape = [this.size, this.size];
        const Z = new Array(shape[0]).fill(0).map(() => new Array(shape[1]).fill(0));
        
        // Fill borders
        for (let i = 0; i < shape[0]; i++) {
            Z[i][0] = 1;
            Z[i][shape[1]-1] = 1;
        }
        for (let j = 0; j < shape[1]; j++) {
            Z[0][j] = 1;
            Z[shape[0]-1][j] = 1;
        }
        
        // Fill maze with random walls
        const complexity = Math.floor(this.complexity * (5 * (shape[0] + shape[1])));
        const density = Math.floor(this.density * (shape[0] / 2 * shape[1] / 2));
        
        // Place random walls
        for (let i = 0; i < density; i++) {
            let x = Math.floor(Math.random() * Math.floor(shape[0] / 2)) * 2;
            let y = Math.floor(Math.random() * Math.floor(shape[1] / 2)) * 2;
            Z[x][y] = 1;
            
            for (let j = 0; j < complexity; j++) {
                const neighbours = [];
                
                if (x > 1) neighbours.push([x - 2, y]);
                if (x < shape[0] - 2) neighbours.push([x + 2, y]);
                if (y > 1) neighbours.push([x, y - 2]);
                if (y < shape[1] - 2) neighbours.push([x, y + 2]);
                
                if (neighbours.length > 0) {
                    const [nextX, nextY] = neighbours[Math.floor(Math.random() * neighbours.length)];
                    if (Z[nextX][nextY] === 0) {
                        Z[nextX][nextY] = 1;
                        Z[nextX + Math.floor((x - nextX) / 2)][nextY + Math.floor((y - nextY) / 2)] = 1;
                        x = nextX;
                        y = nextY;
                    }
                }
            }
        }
        
        return {
            grid: Z,
            startPosition: this.findRandomEmptyCell(Z),
            size: this.size
        };
    }

    findRandomEmptyCell(grid) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (grid.length - 2)) + 1;
            y = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
        } while (grid[x][y] === 1);
        
        return { x, y };
    }

    generateInfinite(centerX, centerY, radius) {
        // Generate a chunk of the infinite maze around the given center coordinates
        const size = radius * 2;
        const chunk = new Array(size).fill(0).map(() => new Array(size).fill(0));
        
        // Use a deterministic algorithm based on coordinates
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const worldX = centerX - radius + x;
                const worldY = centerY - radius + y;
                
                // Use a hash function to determine if this cell should be a wall
                const hash = this.hashCoordinates(worldX, worldY);
                
                // Always have a border
                if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
                    chunk[x][y] = 1;
                }
                // Make some walls based on hash
                else if (hash < 0.3) {
                    chunk[x][y] = 1;
                }
                // Ensure corridors by creating patterns
                else if ((worldX % 2 === 0 && worldY % 2 === 0) && hash < 0.6) {
                    chunk[x][y] = 1;
                }
            }
        }
        
        return chunk;
    }
    
    hashCoordinates(x, y) {
        // Simple deterministic hash function for coordinates
        const A = 1664525;
        const C = 1013904223;
        const M = Math.pow(2, 32);
        
        // Combine coordinates into a single number
        let seed = Math.abs(x * 73856093) ^ Math.abs(y * 19349663);
        
        // Linear congruential generator
        seed = (A * seed + C) % M;
        
        // Return a value between 0 and 1
        return seed / M;
    }
}

