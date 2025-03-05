class LabyrinthRoom {
    constructor() {
        this.socket = new WebsimSocket();
        this.onEvent = null;
        this.initializeSocket();
    }

    initializeSocket() {
        this.socket.onmessage = (event) => {
            const data = event.data;
            if (this.onEvent) {
                this.onEvent(data);
            }
        };
    }

    async getCreator() {
        return await window.websim.getCreatedBy();
    }

    sendPlayerPosition(position, rotation, labyrinthId) {
        this.socket.send({
            type: "playerPosition",
            labyrinthId,
            position,
            rotation,
            echo: false
        });
    }

    async createLabyrinth(data) {
        return await this.socket.collection('labyrinth').create(data);
    }

    async getAllLabyrinths() {
        return this.socket.collection('labyrinth').getList();
    }

    subscribeToLabyrinths(callback) {
        return this.socket.collection('labyrinth').subscribe(callback);
    }

    setEventHandler(handler) {
        this.onEvent = handler;
    }
}

