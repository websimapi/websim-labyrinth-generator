class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioElement = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        // Create audio element
        this.audioElement = document.createElement('audio');
        this.audioElement.src = '/labyrinth.mid';
        this.audioElement.loop = true;
        document.body.appendChild(this.audioElement);
        
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain node
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.5;
        
        // Connect audio element to the context
        const source = this.audioContext.createMediaElementSource(this.audioElement);
        source.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        this.initialized = true;
    }

    play() {
        if (!this.initialized) {
            this.initialize();
        }
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                console.log('Music playing');
            })
            .catch(error => {
                console.error('Error playing audio:', error);
            });
    }

    pause() {
        if (this.initialized && this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        }
    }

    setVolume(volume) {
        if (this.initialized) {
            this.gainNode.gain.value = volume;
        }
    }

    cleanup() {
        if (this.initialized) {
            this.pause();
            this.audioElement.remove();
            this.audioContext.close();
            this.initialized = false;
        }
    }
}

