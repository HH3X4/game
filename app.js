const MAX_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
let webhookUrl = localStorage.getItem('webhookUrl');

document.getElementById('save-webhook').addEventListener('click', () => {
    const input = document.getElementById('webhook-url');
    webhookUrl = input.value.trim();
    if (webhookUrl) {
        localStorage.setItem('webhookUrl', webhookUrl);
        showToast('Webhook URL saved successfully');
        document.getElementById('setup-section').classList.add('hidden');
        document.getElementById('file-section').classList.remove('hidden');
        loadFiles();
    } else {
        showToast('Please enter a valid webhook URL');
    }
});

document.getElementById('upload-button').addEventListener('click', () => {
    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;

    if (files.length > 0) {
        Array.from(files).forEach(uploadFile);
    } else {
        showToast('Please select files to upload');
    }
});

async function uploadFile(file) {
    const fileId = generateFileId();
    const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
    
    showProgressBar();

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = file.slice(chunkIndex * MAX_CHUNK_SIZE, (chunkIndex + 1) * MAX_CHUNK_SIZE);
        const chunkBlob = new Blob([chunk], { type: 'application/octet-stream' });
        
        const formData = new FormData();
        formData.append('file', chunkBlob, `${file.name}.part${chunkIndex}`);
        formData.append('payload_json', JSON.stringify({
            content: JSON.stringify({
                fileId,
                fileName: file.name,
                chunkIndex,
                totalChunks,
                fileType: file.type,
                fileSize: file.size
            })
        }));

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            updateProgressBar((chunkIndex + 1) / totalChunks * 100);
        } catch (error) {
            console.error('Error uploading chunk:', error);
            showToast(`Error uploading ${file.name}`);
            hideProgressBar();
            return;
        }
    }

    hideProgressBar();
    showToast(`${file.name} uploaded successfully`);
    loadFiles();
}

function generateFileId() {
    return CryptoJS.lib.WordArray.random(16).toString();
}

async function loadFiles() {
    try {
        const response = await fetch(webhookUrl);
        if (response.ok) {
            const data = await response.json();
            console.log('Parsed data:', data);
            
            let messages = [];
            if (Array.isArray(data)) {
                messages = data;
            } else if (data && typeof data === 'object') {
                messages = data.messages || [];
            }
            
            if (!Array.isArray(messages)) {
                throw new Error('Invalid response format');
            }

            const fileList = document.getElementById('file-list');
            fileList.innerHTML = '';

            const files = {};

            messages.forEach(message => {
                if (message && message.content && message.attachments) {
                    try {
                        const fileInfo = JSON.parse(message.content);
                        if (!files[fileInfo.fileId]) {
                            files[fileInfo.fileId] = {
                                name: fileInfo.fileName,
                                type: fileInfo.fileType,
                                size: fileInfo.fileSize,
                                chunks: new Array(fileInfo.totalChunks).fill(null)
                            };
                        }
                        files[fileInfo.fileId].chunks[fileInfo.chunkIndex] = message.attachments[0].url;
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                }
            });

            if (Object.keys(files).length === 0) {
                fileList.innerHTML = '<p>No files found.</p>';
            } else {
                Object.entries(files).forEach(([fileId, fileInfo]) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <span>${fileInfo.name} (${formatFileSize(fileInfo.size)})</span>
                        <div class="file-actions">
                            <button onclick="downloadFile('${fileId}')"><i class="fas fa-download"></i> Download</button>
                            <button onclick="deleteFile('${fileId}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    `;
                    fileList.appendChild(fileItem);
                });
            }
        } else {
            showToast('Error loading files');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files');
    }
}

async function downloadFile(fileId) {
    try {
        const response = await fetch(webhookUrl);
        if (response.ok) {
            const messages = await response.json();
            const fileChunks = messages
                .filter(message => {
                    try {
                        const fileInfo = JSON.parse(message.content);
                        return fileInfo.fileId === fileId;
                    } catch {
                        return false;
                    }
                })
                .sort((a, b) => JSON.parse(a.content).chunkIndex - JSON.parse(b.content).chunkIndex);

            if (fileChunks.length === 0) {
                showToast('File not found');
                return;
            }

            const fileInfo = JSON.parse(fileChunks[0].content);
            const fileName = fileInfo.fileName;
            const fileType = fileInfo.fileType;

            showProgressBar();

            const chunks = await Promise.all(fileChunks.map(async (chunk, index) => {
                const response = await fetch(chunk.attachments[0].url);
                updateProgressBar((index + 1) / fileChunks.length * 100);
                return response.arrayBuffer();
            }));

            const fullFile = new Blob(chunks, { type: fileType });
            const downloadUrl = URL.createObjectURL(fullFile);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(downloadUrl);
            hideProgressBar();
            showToast(`${fileName} downloaded successfully`);
        } else {
            showToast('Error downloading file');
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        showToast('Error downloading file');
        hideProgressBar();
    }
}

async function deleteFile(fileId) {
    try {
        const response = await fetch(webhookUrl);
        if (response.ok) {
            const messages = await response.json();
            const fileMessages = messages.filter(message => {
                try {
                    const fileInfo = JSON.parse(message.content);
                    return fileInfo.fileId === fileId;
                } catch {
                    return false;
                }
            });

            for (const message of fileMessages) {
                await fetch(`${webhookUrl}/messages/${message.id}`, {
                    method: 'DELETE'
                });
            }

            showToast('File deleted successfully');
            loadFiles();
        } else {
            showToast('Error deleting file');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast('Error deleting file');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function showProgressBar() {
    document.getElementById('progress-bar').classList.remove('hidden');
    document.getElementById('progress').style.width = '0%';
}

function updateProgressBar(percentage) {
    document.getElementById('progress').style.width = `${percentage}%`;
}

function hideProgressBar() {
    document.getElementById('progress-bar').classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

window.addEventListener('load', () => {
    if (webhookUrl) {
        document.getElementById('setup-section').classList.add('hidden');
        document.getElementById('file-section').classList.remove('hidden');
        loadFiles();
    }
});

async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                return response;
            }
        } catch (error) {
            if (i === maxRetries - 1) throw error;
        }
    }
}
