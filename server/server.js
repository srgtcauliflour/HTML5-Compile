const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));

// Endpoint to handle file uploads and compilation
app.post('/upload', upload.any(), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const files = req.files;
    const targets = JSON.parse(req.body.targets || '[]');
    const zip = new JSZip();

    try {
        // Create output directories for each target
        const targetDirs = {};
        targets.forEach(target => {
            targetDirs[target] = path.join(__dirname, 'compiled', target);
            fs.mkdirSync(targetDirs[target], { recursive: true });
        });

        // Handle each file
        for (const file of files) {
            const filePath = path.join(__dirname, 'uploads', file.filename);
            const ext = path.extname(file.originalname);

            for (const target of targets) {
                let command = '';

                switch (target) {
                    case 'x86_64-linux':
                        command = `gcc ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, '.out'))}`;
                        break;
                    case 'arm-linux':
                        command = `arm-linux-gnueabihf-gcc ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, '.out'))}`;
                        break;
                    case 'x86_64-win':
                        command = `x86_64-w64-mingw32-gcc ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, '.exe'))}`;
                        break;
                    case 'arm-win':
                        command = `arm-w64-mingw32-gcc ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, '.exe'))}`;
                        break;
                    case 'x86_64-macos':
                        command = `clang ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, ''))}`;
                        break;
                    case 'arm-macos':
                        command = `clang ${filePath} -target arm64-apple-macos11.0 ${filePath} -o ${path.join(targetDirs[target], file.filename.replace(ext, ''))}`;
                        break;
                    // Add more target handling as needed
                    default:
                        break;
                }

                if (command) {
                    await new Promise((resolve, reject) => {
                        exec(command, (err, stdout, stderr) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                }
            }
        }

        // Add compiled files to zip
        fs.readdirSync(path.join(__dirname, 'compiled')).forEach(target => {
            const targetDir = path.join(__dirname, 'compiled', target);
            if (fs.statSync(targetDir).isDirectory()) {
                zip.folder(target);
                fs.readdirSync(targetDir).forEach(file => {
                    zip.file(path.join(target, file), fs.readFileSync(path.join(targetDir, file)));
                });
            }
        });

        // Send zip file
        zip.generateAsync({ type: 'nodebuffer' })
           .then(content => {
               res.setHeader('Content-Disposition', 'attachment; filename=compiled_files.zip');
               res.setHeader('Content-Type', 'application/zip');
               res.send(content);
           });

    } catch (error) {
        res.status(500).send(`Compilation failed: ${error.message}`);
    } finally {
        // Clean up uploaded files and directories
        files.forEach(file => fs.unlinkSync(path.join(__dirname, 'uploads', file.filename)));
        fs.rmdirSync(path.join(__dirname, 'uploads'), { recursive: true });
        fs.rmdirSync(path.join(__dirname, 'compiled'), { recursive: true });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
const app = express();
const port = 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));

// Endpoint to handle file uploads and compilation
app.post('/upload', upload.any(), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const files = req.files;
    const zip = new JSZip();
    
    try {
        // Handle each file
        for (const file of files) {
            const filePath = path.join(__dirname, 'uploads', file.filename);
            const ext = path.extname(file.originalname);
            let command = '';

            switch (ext) {
                case '.c':
                case '.cpp':
                    command = `g++ ${filePath} -o ${filePath}.out && mv ${filePath}.out /compiled/${file.filename}.out`;
                    break;
                case '.java':
                    command = `javac ${filePath} && mv ${filePath} /compiled/`;
                    break;
                case '.py':
                    command = `python3 ${filePath}`;
                    break;
                case '.rb':
                    command = `ruby ${filePath}`;
                    break;
                case '.hs':
                    command = `ghc ${filePath} && mv ${filePath.replace('.hs', '')} /compiled/`;
                    break;
                case '.go':
                    command = `go build ${filePath} && mv ${filePath.replace('.go', '')} /compiled/`;
                    break;
                case '.rs':
                    command = `rustc ${filePath} && mv ${filePath.replace('.rs', '')} /compiled/`;
                    break;
                case '.swift':
                    command = `swiftc ${filePath} -o ${filePath.replace('.swift', '')} && mv ${filePath.replace('.swift', '')} /compiled/`;
                    break;
                case '.ts':
                    command = `tsc ${filePath} && mv ${filePath.replace('.ts', '.js')} /compiled/`;
                    break;
                case '.d':
                    command = `dmd ${filePath} && mv ${filePath.replace('.d', '')} /compiled/`;
                    break;
                case '.kt':
                    command = `kotlinc ${filePath} -include-runtime -d ${filePath.replace('.kt', '.jar')} && mv ${filePath.replace('.kt', '.jar')} /compiled/`;
                    break;
                default:
                    throw new Error(`Unsupported file type: ${ext}`);
            }

            await executeCommand(command);

            // Add compiled files to zip
            const compiledFiles = fs.readdirSync(path.join(__dirname, 'compiled'));
            for (const file of compiledFiles) {
                zip.file(file, fs.readFileSync(path.join(__dirname, 'compiled', file)));
            }
        }

        // Clean up uploaded files
        fs.readdirSync('uploads').forEach(file => fs.unlinkSync(path.join('uploads', file)));
        
        // Prepare zip file for download
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=compiled_files.zip');
        res.setHeader('Content-Type', 'application/zip');
        res.send(zipBuffer);

    } catch (error) {
        res.status(500).send(`Error during compilation: ${error.message}`);
    }
});

// Function to execute shell commands
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error);
            } else {
                resolve(stdout);
            }
        });
    });
}

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});