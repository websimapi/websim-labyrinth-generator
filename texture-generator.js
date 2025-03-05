class TextureGenerator {
    constructor() {
        this.textureCache = new Map();
    }

    async generateBiomeDescription(biomeType) {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Generate a detailed description for a labyrinth wall texture based on the biome type. The description should be vivid and specific, describing materials, colors, patterns, and any unique features.`
                    },
                    {
                        role: "user",
                        content: `Create a detailed description for labyrinth walls in a ${biomeType} biome. Focus on texture, materials, colors, and any unique elements. This will be used to generate an image texture.`
                    }
                ]
            });
            
            return completion.content;
        } catch (error) {
            console.error("Error generating biome description:", error);
            return `Stone walls with moss and patterns typical of a ${biomeType} environment.`;
        }
    }

    async generateTextureFromDescription(description) {
        try {
            // Check if we already have this texture cached
            if (this.textureCache.has(description)) {
                return this.textureCache.get(description);
            }
            
            const result = await websim.imageGen({
                prompt: `Highly detailed seamless texture for a labyrinth wall: ${description}. Digital art, tileable, 4k, no text, no faces`,
                aspect_ratio: "1:1"
            });
            
            // Cache the result
            this.textureCache.set(description, result.url);
            
            return result.url;
        } catch (error) {
            console.error("Error generating texture:", error);
            return null;
        }
    }

    async getBiomeTexture(biomeType) {
        const description = await this.generateBiomeDescription(biomeType);
        return await this.generateTextureFromDescription(description);
    }

    // Preload common biome textures
    async preloadCommonTextures() {
        const commonBiomes = [
            "forest", "desert", "volcanic", "ice", "underwater", "crystal", 
            "ancient ruins", "futuristic", "cosmic"
        ];
        
        const promises = commonBiomes.map(async (biome) => {
            const description = await this.generateBiomeDescription(biome);
            const url = await this.generateTextureFromDescription(description);
            return { biome, url };
        });
        
        return Promise.all(promises);
    }
}

