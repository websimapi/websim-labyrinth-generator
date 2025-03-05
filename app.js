const { useState, useEffect, useRef, useMemo, useSyncExternalStore } = React;

// Loading component
const Loading = ({ message }) => (
    <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <div className="loading-text">{message || 'Loading...'}</div>
    </div>
);

// Main application component
const App = () => {
    const [view, setView] = useState('home'); // home, generator, game, gallery
    const [labyrinthRoom, setLabyrinthRoom] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [currentLabyrinth, setCurrentLabyrinth] = useState(null);
    const [generatorForm, setGeneratorForm] = useState({
        name: '',
        description: '',
        biomeType: '',
        isInfinite: false
    });
    
    // Initialize WebSocket and audio controller
    useEffect(() => {
        const room = new LabyrinthRoom();
        const audioCtrl = new AudioController();
        
        setLabyrinthRoom(room);
        
        return () => {
            audioCtrl.cleanup();
        };
    }, []);
    
    // Handle view change
    const changeView = (newView) => {
        setView(newView);
    };
    
    // Main render
    return (
        <div className="app-container">
            {loading && <Loading message={loadingMessage} />}
            
            {view === 'home' && (
                <HomeView 
                    onNavigate={changeView} 
                />
            )}
            
            {view === 'generator' && (
                <GeneratorView 
                    onNavigate={changeView}
                    onCreateLabyrinth={async (labyrinthData) => {
                        setLoading(true);
                        setLoadingMessage('Creating your labyrinth...');
                        
                        try {
                            const newLabyrinth = await labyrinthRoom.createLabyrinth(labyrinthData);
                            setCurrentLabyrinth(newLabyrinth);
                            setLoading(false);
                            changeView('game');
                        } catch (error) {
                            console.error('Error creating labyrinth:', error);
                            setLoading(false);
                            alert('Failed to create labyrinth. Please try again.');
                        }
                    }}
                    formState={generatorForm}
                    setFormState={setGeneratorForm}
                />
            )}
            
            {view === 'gallery' && (
                <GalleryView 
                    onNavigate={changeView}
                    labyrinthRoom={labyrinthRoom}
                    onSelectLabyrinth={(labyrinth) => {
                        setCurrentLabyrinth(labyrinth);
                        changeView('game');
                    }}
                />
            )}
            
            {view === 'game' && currentLabyrinth && (
                <GameView 
                    onNavigate={changeView}
                    labyrinthRoom={labyrinthRoom}
                    labyrinth={currentLabyrinth}
                />
            )}
        </div>
    );
};

// Home view component
const HomeView = ({ onNavigate }) => {
    return (
        <div className="generator-container" style={{ 
            marginTop: '100px',
            textAlign: 'center'
        }}>
            <h1 className="app-title">This 3D Labyrinth Does Not Exist</h1>
            <p style={{ marginBottom: '20px', color: '#ccc' }}>
                Generate and explore unique, AI-created labyrinths in a collaborative multiplayer environment.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button onClick={() => onNavigate('generator')}>
                    Create New Labyrinth
                </button>
                <button onClick={() => onNavigate('gallery')}>
                    Explore Labyrinth Gallery
                </button>
            </div>
        </div>
    );
};

// Generator view component
const GeneratorView = ({ onNavigate, onCreateLabyrinth, formState, setFormState }) => {
    const [genLoading, setGenLoading] = useState(false);
    const [genText, setGenText] = useState('');
    const [textCreated, setTextCreated] = useState(false);
    
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState({
            ...formState,
            [name]: type === 'checkbox' ? checked : value
        });
    };
    
    const generateLabyrinthText = async () => {
        if (!formState.biomeType) {
            alert('Please enter a biome type to generate your labyrinth');
            return;
        }
        
        setGenLoading(true);
        
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Generate a detailed and imaginative description of a labyrinth based on the biome type provided. Include details about its construction, history, challenges, and unique features.`
                    },
                    {
                        role: "user",
                        content: `Create a detailed description of a labyrinth in a ${formState.biomeType} environment. The labyrinth is named "${formState.name || 'Unnamed Labyrinth'}". Make it vivid and immersive.`
                    }
                ]
            });
            
            setGenText(completion.content);
            setTextCreated(true);
        } catch (error) {
            console.error("Error generating text:", error);
            alert("Failed to generate description. Please try again.");
        } finally {
            setGenLoading(false);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formState.name || !formState.biomeType) {
            alert('Please fill in all required fields');
            return;
        }
        
        // If we don't have generated text yet, generate it
        if (!textCreated) {
            await generateLabyrinthText();
        }
        
        const description = genText || formState.description;
        
        // Generate the maze data
        const mazeGenerator = new MazeGenerator(20, 0.75, 0.75);
        const mazeData = mazeGenerator.generate();
        
        const labyrinthData = {
            name: formState.name,
            description: description,
            biomeType: formState.biomeType,
            isInfinite: formState.isInfinite,
            maze: mazeData,
            created: new Date().toISOString()
        };
        
        onCreateLabyrinth(labyrinthData);
    };
    
    return (
        <div className="generator-container" style={{ marginTop: '50px' }}>
            <h1 className="app-title">Create New Labyrinth</h1>
            
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="name">Labyrinth Name:</label>
                    <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        value={formState.name} 
                        onChange={handleChange}
                        placeholder="Enter a name for your labyrinth"
                        required
                    />
                </div>
                
                <div className="input-group">
                    <label htmlFor="biomeType">Biome Type:</label>
                    <input 
                        type="text" 
                        id="biomeType" 
                        name="biomeType" 
                        value={formState.biomeType} 
                        onChange={handleChange}
                        placeholder="e.g. desert, volcanic, forest, crystal cave"
                        required
                    />
                </div>
                
                <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <input 
                        type="checkbox" 
                        id="isInfinite" 
                        name="isInfinite" 
                        checked={formState.isInfinite} 
                        onChange={handleChange}
                        style={{ width: 'auto', marginRight: '10px' }}
                    />
                    <label htmlFor="isInfinite">Infinite Labyrinth</label>
                </div>
                
                {!textCreated ? (
                    <button 
                        type="button" 
                        onClick={generateLabyrinthText} 
                        disabled={genLoading || !formState.biomeType}
                    >
                        {genLoading ? 'Generating...' : 'Generate Description'}
                    </button>
                ) : (
                    <div className="input-group">
                        <label htmlFor="genDescription">Generated Description:</label>
                        <textarea 
                            id="genDescription" 
                            name="genDescription" 
                            value={genText} 
                            readOnly
                            style={{ background: '#2a2a2a' }}
                        />
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="button" onClick={() => onNavigate('home')} style={{ background: '#555' }}>
                        Back
                    </button>
                    <button type="submit" disabled={genLoading}>
                        Create Labyrinth
                    </button>
                </div>
            </form>
        </div>
    );
};

// Gallery view component
const GalleryView = ({ onNavigate, labyrinthRoom, onSelectLabyrinth }) => {
    const labyrinths = useSyncExternalStore(
        labyrinthRoom.subscribeToLabyrinths.bind(labyrinthRoom),
        labyrinthRoom.getAllLabyrinths.bind(labyrinthRoom)
    );
    
    return (
        <div style={{ padding: '20px' }}>
            <h1 className="app-title">Labyrinth Gallery</h1>
            <button onClick={() => onNavigate('home')} className="back-button">
                Back to Home
            </button>
            
            {labyrinths.length === 0 ? (
                <div style={{ textAlign: 'center', margin: '50px 0' }}>
                    <p>No labyrinths found. Be the first to create one!</p>
                    <button onClick={() => onNavigate('generator')} style={{ marginTop: '20px' }}>
                        Create New Labyrinth
                    </button>
                </div>
            ) : (
                <div className="gallery-container">
                    {labyrinths.map(labyrinth => (
                        <div key={labyrinth.id} className="gallery-card">
                            <div className="gallery-details">
                                <h3 className="gallery-title">{labyrinth.name}</h3>
                                <p className="gallery-desc">{labyrinth.description.substring(0, 150)}...</p>
                                <p style={{ marginTop: '5px', color: '#888', fontSize: '12px' }}>
                                    Biome: {labyrinth.biomeType}
                                </p>
                                <p style={{ color: '#888', fontSize: '12px' }}>
                                    Created by: {labyrinth.username}
                                </p>
                                <div className="gallery-buttons">
                                    <button 
                                        className="gallery-action" 
                                        onClick={() => onSelectLabyrinth(labyrinth)}
                                    >
                                        Explore
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Game view component
const GameView = ({ onNavigate, labyrinthRoom, labyrinth }) => {
    const gameContainerRef = useRef(null);
    const rendererRef = useRef(null);
    const audioControllerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    useEffect(() => {
        // Initialize audio controller
        audioControllerRef.current = new AudioController();
        
        // Create the renderer
        const renderer = new LabyrinthRenderer(
            gameContainerRef.current,
            audioControllerRef.current
        );
        rendererRef.current = renderer;
        
        // Set up event handler
        labyrinthRoom.setEventHandler(handleEvent);
        
        // Set up player position change listener
        const unsubscribe = renderer.onPositionChange((data) => {
            labyrinthRoom.sendPlayerPosition(data.position, data.rotation, labyrinth.id);
        });
        
        return () => {
            // Cleanup
            if (rendererRef.current) {
                rendererRef.current.cleanup();
            }
            if (audioControllerRef.current) {
                audioControllerRef.current.cleanup();
            }
            unsubscribe();
        };
    }, []);
    
    const handleEvent = (data) => {
        if (data.type === 'playerPosition' && data.labyrinthId === labyrinth.id) {
            if (rendererRef.current) {
                rendererRef.current.updateOtherPlayer(data.clientId, {
                    position: data.position,
                    rotation: data.rotation
                });
            }
        } else if (data.type === 'disconnected') {
            if (rendererRef.current) {
                rendererRef.current.removeOtherPlayer(data.clientId);
            }
        }
    };
    
    const startGame = async () => {
        if (!rendererRef.current) return;
        
        try {
            await rendererRef.current.initialize(
                labyrinth.maze,
                labyrinth.biomeType,
                labyrinth.isInfinite,
                labyrinth.id
            );
            rendererRef.current.lock();
            setIsPlaying(true);
        } catch (error) {
            console.error('Error initializing game:', error);
            alert('Failed to start the labyrinth. Please try again.');
        }
    };
    
    const exitGame = () => {
        if (rendererRef.current) {
            rendererRef.current.unlock();
        }
        onNavigate('gallery');
    };
    
    return (
        <div className="game-container" ref={gameContainerRef}>
            {!isPlaying && (
                <div className="game-overlay">
                    <div className="game-instructions">
                        <h2 style={{ marginBottom: '15px' }}>{labyrinth.name}</h2>
                        <p style={{ marginBottom: '20px', fontSize: '14px' }}>{labyrinth.description}</p>
                        <button onClick={startGame}>Enter Labyrinth</button>
                        <p style={{ marginTop: '15px', fontSize: '12px', color: '#aaa' }}>
                            Controls: WASD/Arrow Keys to move, Mouse to look around
                        </p>
                    </div>
                </div>
            )}
            
            <button onClick={exitGame} className="back-button">
                Exit Labyrinth
            </button>
        </div>
    );
};

// Mount the app
ReactDOM.render(<App />, document.getElementById('root'));

