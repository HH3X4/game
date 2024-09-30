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
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showToast(`${file.name} uploaded successfully`);
            loadFiles();
        } else {
            showToast(`Error uploading ${file.name}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast(`Error uploading ${file.name}`);
    }
}

async function loadFiles() {
    try {
        const response = await fetch(webhookUrl);
        if (response.ok) {
            const messages = await response.json();
            const fileList = document.getElementById('file-list');
            fileList.innerHTML = '';

            messages.forEach(message => {
                if (message.attachments.length > 0) {
                    message.attachments.forEach(attachment => {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'file-item';
                        fileItem.innerHTML = `
                            <span>${attachment.filename}</span>
                            <div class="file-actions">
                                <a href="${attachment.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>
                                <button onclick="deleteFile('${message.id}')"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        `;
                        fileList.appendChild(fileItem);
                    });
                }
            });
        } else {
            showToast('Error loading files');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files');
    }
}

async function deleteFile(messageId) {
    try {
        const response = await fetch(`${webhookUrl}/messages/${messageId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
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

window.addEventListener('load', () => {
    if (webhookUrl) {
        document.getElementById('setup-section').classList.add('hidden');
        document.getElementById('file-section').classList.remove('hidden');
        loadFiles();
    }
});
