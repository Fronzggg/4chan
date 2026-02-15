const MediaHandler = {
    maxSize: 10 * 1024 * 1024,
    
    allowedTypes: {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/webm']
    },

    validateFile(file) {
        if (!file) return { valid: false, error: 'No file' };
        
        if (file.size > this.maxSize) {
            return { valid: false, error: 'File too large (max 10MB)' };
        }

        const isImage = this.allowedTypes.image.includes(file.type);
        const isVideo = this.allowedTypes.video.includes(file.type);

        if (!isImage && !isVideo) {
            return { valid: false, error: 'Invalid file type' };
        }

        return { valid: true, type: isImage ? 'image' : 'video' };
    },

    async compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const maxDim = 1920;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = (height / width) * maxDim;
                            width = maxDim;
                        } else {
                            width = (width / height) * maxDim;
                            height = maxDim;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    createPreview(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => callback(e.target.result);
        reader.readAsDataURL(file);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaHandler;
}
