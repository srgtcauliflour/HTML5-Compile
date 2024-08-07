document.addEventListener('DOMContentLoaded', () => {
    const commandInput = document.getElementById('commandInput');
    const output = document.getElementById('output');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const downloadLink = document.getElementById('downloadLink');

    uploadButton.addEventListener('click', async () => {
        const files = fileInput.files;
        const selectedTargets = Array.from(document.querySelectorAll('input[name="targets"]:checked'))
                                     .map(checkbox => checkbox.value);

        if (files.length === 0) {
            output.innerText += `No files selected.\n`;
            return;
        }

        if (selectedTargets.length === 0) {
            output.innerText += `No targets selected.\n`;
            return;
        }

        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }
        formData.append('targets', JSON.stringify(selectedTargets));

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = 'compiled_files.zip';
            downloadLink.style.display = 'block';
            output.innerText += `Compilation complete. Download your files.\n`;
        } catch (error) {
            output.innerText += `Error: ${error.message}\n`;
        }
    });
});