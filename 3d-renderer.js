class LabyrinthRenderer {
    constructor(container, audioController) {
        this.container = container;
        this.audioController = audioController;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.maze = null;
        this.mazeSize = 0;
        this.cellSize = 4;
        this.wallHeight = 3;
        this.playerHeight = 1.7;
        this.moveSpeed = 0.1;
        this.isMobile = window.innerWidth < 768;
        this.wallTextures = new Map();
        this.biomeType = "default";
        this.textureGenerator = new TextureGenerator();
        this.animationId = null;
        this.otherPlayers = new Map();
        this.playerMoveListeners = [];
        this.lastPosition = { x: 0, y: 0, z: 0 };
        this.infiniteMaze = null;
        this.infiniteChunks = new Map();
        this.loadedRadius = 5;
        this.isInfinite = false;
        this.labyrinthId = null;
    }

    async initialize(maze, biomeType, isInfinite = false, labyrinthId = null) {
        this.cleanup();
        
        this.maze = maze;
        this.mazeSize = maze.size;
        this.biomeType = biomeType;
        this.isInfinite = isInfinite;
        this.labyrinthId = labyrinthId;
        
        if (isInfinite) {
            this.infiniteMaze = new MazeGenerator();
        }
        
        // Set up Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.05);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = this.playerHeight;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new THREE.PointerLockControls(this.camera, this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Generate wall texture
        await this.loadTexture(biomeType);
        
        // Create the maze
        if (isInfinite) {
            // Set initial position for infinite maze
            this.camera.position.set(0, this.playerHeight, 0);
            this.updateInfiniteMaze();
        } else {
            this.createMaze();
            // Set player at start position
            const { x, y } = maze.startPosition;
            this.camera.position.x = x * this.cellSize;
            this.camera.position.z = y * this.cellSize;
        }
        
        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Mobile controls
        if (this.isMobile) {
            this.setupMobileControls();
        }
        
        // Start animation loop
        this.animate();
        
        // Play audio
        this.audioController.play();
        
        return this;
    }

    async loadTexture(biomeType) {
        if (this.wallTextures.has(biomeType)) {
            return this.wallTextures.get(biomeType);
        }
        
        try {
            const textureUrl = await this.textureGenerator.getBiomeTexture(biomeType);
            if (textureUrl) {
                const texture = new THREE.TextureLoader().load(textureUrl);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                this.wallTextures.set(biomeType, texture);
                return texture;
            }
        } catch (error) {
            console.error("Error loading texture:", error);
        }
        
        // Fallback texture
        const texture = new THREE.TextureLoader().load('https://images.websim.ai/avatar/default');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        this.wallTextures.set(biomeType, texture);
        return texture;
    }

    createMaze() {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: this.wallTextures.get(this.biomeType),
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const ceilingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Floor and ceiling
        const floorGeometry = new THREE.PlaneGeometry(this.mazeSize * this.cellSize, this.mazeSize * this.cellSize);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.position.x = (this.mazeSize * this.cellSize) / 2 - this.cellSize / 2;
        floor.position.z = (this.mazeSize * this.cellSize) / 2 - this.cellSize / 2;
        this.scene.add(floor);
        
        const ceilingGeometry = new THREE.PlaneGeometry(this.mazeSize * this.cellSize, this.mazeSize * this.cellSize);
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = this.wallHeight;
        ceiling.position.x = (this.mazeSize * this.cellSize) / 2 - this.cellSize / 2;
        ceiling.position.z = (this.mazeSize * this.cellSize) / 2 - this.cellSize / 2;
        this.scene.add(ceiling);
        
        // Walls
        const wallGeometry = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
        
        for (let x = 0; x < this.mazeSize; x++) {
            for (let z = 0; z < this.mazeSize; z++) {
                if (this.maze.grid[x][z] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.x = x * this.cellSize;
                    wall.position.y = this.wallHeight / 2;
                    wall.position.z = z * this.cellSize;
                    this.scene.add(wall);
                }
            }
        }
    }

    updateInfiniteMaze() {
        // Get player's current grid position
        const playerGridX = Math.floor(this.camera.position.x / this.cellSize);
        const playerGridZ = Math.floor(this.camera.position.z / this.cellSize);
        
        // Generate chunks around player
        for (let xOffset = -this.loadedRadius; xOffset <= this.loadedRadius; xOffset++) {
            for (let zOffset = -this.loadedRadius; zOffset <= this.loadedRadius; zOffset++) {
                const chunkX = playerGridX + xOffset * 10;
                const chunkZ = playerGridZ + zOffset * 10;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                if (!this.infiniteChunks.has(chunkKey)) {
                    // Generate and add new chunk
                    const chunk = this.infiniteMaze.generateInfinite(chunkX, chunkZ, 5);
                    this.createMazeChunk(chunk, chunkX, chunkZ);
                    this.infiniteChunks.set(chunkKey, true);
                }
            }
        }
    }

    createMazeChunk(chunk, startX, startZ) {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: this.wallTextures.get(this.biomeType),
            roughness: 0.8,
            metalness: 0.2
        });
        
        const wallGeometry = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
        const chunkGroup = new THREE.Group();
        
        const size = chunk.length;
        
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (chunk[x][z] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.x = (startX + x) * this.cellSize;
                    wall.position.y = this.wallHeight / 2;
                    wall.position.z = (startZ + z) * this.cellSize;
                    chunkGroup.add(wall);
                }
            }
        }
        
        this.scene.add(chunkGroup);
    }

    setupMobileControls() {
        // Create mobile control buttons if they don't exist
        if (!document.querySelector('.mobile-controls')) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'mobile-controls';
            
            const buttons = [
                { id: 'forward', text: '↑', x: 0, y: -1 },
                { id: 'left', text: '←', x: -1, y: 0 },
                { id: 'backward', text: '↓', x: 0, y: 1 },
                { id: 'right', text: '→', x: 1, y: 0 }
            ];
            
            buttons.forEach(btn => {
                const button = document.createElement('div');
                button.id = btn.id;
                button.className = 'control-button';
                button.innerText = btn.text;
                
                // Touch events
                button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.mobileMove(btn.x, btn.y);
                    button.interval = setInterval(() => this.mobileMove(btn.x, btn.y), 50);
                });
                
                button.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (button.interval) {
                        clearInterval(button.interval);
                        button.interval = null;
                    }
                });
                
                controlsDiv.appendChild(button);
            });
            
            this.container.appendChild(controlsDiv);
        }
    }

    mobileMove(x, y) {
        // Convert direction to camera-relative direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        const forward = direction.clone();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        
        // Calculate movement vector
        const moveX = right.x * x + forward.x * y;
        const moveZ = right.z * x + forward.z * y;
        
        // Update position
        const newX = this.camera.position.x + moveX * this.moveSpeed * 3;
        const newZ = this.camera.position.z + moveZ * this.moveSpeed * 3;
        
        // Check for collision
        if (!this.checkCollision(newX, newZ)) {
            this.camera.position.x = newX;
            this.camera.position.z = newZ;
            this.updatePosition();
        }
    }

    onKeyDown(event) {
        if (!this.controls.isLocked) return;
        
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                velocity.add(direction.clone().multiplyScalar(this.moveSpeed));
                break;
            case 'KeyS':
            case 'ArrowDown':
                velocity.add(direction.clone().multiplyScalar(-this.moveSpeed));
                break;
            case 'KeyA':
            case 'ArrowLeft':
                velocity.add(new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).multiplyScalar(-this.moveSpeed));
                break;
            case 'KeyD':
            case 'ArrowRight':
                velocity.add(new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).multiplyScalar(this.moveSpeed));
                break;
        }
        
        // Update position
        const newX = this.camera.position.x + velocity.x;
        const newZ = this.camera.position.z + velocity.z;
        
        // Check for collision
        if (!this.checkCollision(newX, newZ)) {
            this.camera.position.x = newX;
            this.camera.position.z = newZ;
            this.updatePosition();
        }
    }

    checkCollision(x, z) {
        if (this.isInfinite) {
            // For infinite maze, check in the current chunk
            const gridX = Math.floor(x / this.cellSize);
            const gridZ = Math.floor(z / this.cellSize);
            
            // Check if this is a wall in the infinite maze
            // This is a simplified collision detection for the infinite maze
            const hash = this.infiniteMaze.hashCoordinates(gridX, gridZ);
            return hash < 0.3 || ((gridX % 2 === 0 && gridZ % 2 === 0) && hash < 0.6);
        } else {
            // For fixed maze, check the grid
            const gridX = Math.floor(x / this.cellSize);
            const gridZ = Math.floor(z / this.cellSize);
            
            // Check bounds
            if (gridX < 0 || gridX >= this.mazeSize || gridZ < 0 || gridZ >= this.mazeSize) {
                return true; // Collision with boundary
            }
            
            // Check if this is a wall
            return this.maze.grid[gridX][gridZ] === 1;
        }
    }

    updatePosition() {
        // Update infinite maze chunks if needed
        if (this.isInfinite) {
            this.updateInfiniteMaze();
        }
        
        // Only send updates if position has changed significantly
        const position = this.camera.position;
        const rotation = this.camera.rotation;
        
        const dist = Math.sqrt(
            Math.pow(position.x - this.lastPosition.x, 2) +
            Math.pow(position.y - this.lastPosition.y, 2) +
            Math.pow(position.z - this.lastPosition.z, 2)
        );
        
        if (dist > 0.1 || this.lastPosition.changed === true) {
            this.lastPosition = {
                x: position.x,
                y: position.y,
                z: position.z,
                changed: false
            };
            
            // Notify listeners about movement
            this.playerMoveListeners.forEach(callback => {
                callback({
                    position: { x: position.x, y: position.y, z: position.z },
                    rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
                });
            });
        }
    }

    onPositionChange(callback) {
        this.playerMoveListeners.push(callback);
        return () => {
            this.playerMoveListeners = this.playerMoveListeners.filter(cb => cb !== callback);
        };
    }

    updateOtherPlayer(clientId, data) {
        const { position, rotation } = data;
        
        if (!this.otherPlayers.has(clientId)) {
            // Create a new player representation
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshLambertMaterial({ color: this.getPlayerColor(clientId) });
            const playerMesh = new THREE.Mesh(geometry, material);
            
            this.otherPlayers.set(clientId, playerMesh);
            this.scene.add(playerMesh);
        }
        
        // Update the player's position
        const playerMesh = this.otherPlayers.get(clientId);
        playerMesh.position.set(position.x, position.y, position.z);
        
        // Update rotation if needed
        if (rotation) {
            playerMesh.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }

    removeOtherPlayer(clientId) {
        if (this.otherPlayers.has(clientId)) {
            const playerMesh = this.otherPlayers.get(clientId);
            this.scene.remove(playerMesh);
            this.otherPlayers.delete(clientId);
        }
    }

    getPlayerColor(clientId) {
        // Generate a deterministic color based on client ID
        let hash = 0;
        for (let i = 0; i < clientId.length; i++) {
            hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const r = (hash & 0xFF0000) >> 16;
        const g = (hash & 0x00FF00) >> 8;
        const b = hash & 0x0000FF;
        
        return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.isMobile = window.innerWidth < 768;
    }

    lock() {
        this.controls.lock();
    }

    unlock() {
        this.controls.unlock();
    }

    isLocked() {
        return this.controls.isLocked;
    }

    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        document.removeEventListener('keydown', this.onKeyDown.bind(this));
        
        // Remove mobile controls
        const mobileControls = document.querySelector('.mobile-controls');
        if (mobileControls) {
            mobileControls.remove();
        }
        
        // Cleanup Three.js objects
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (object.material.map) {
                        object.material.map.dispose();
                    }
                    object.material.dispose();
                }
            });
        }
        
        // Cleanup renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        // Cleanup other resources
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.maze = null;
        this.otherPlayers.clear();
        this.infiniteChunks.clear();
    }
}

