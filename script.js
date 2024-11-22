// 获取DOM元素
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const uploadArea = document.querySelector('.upload-area');
const preview = document.getElementById('preview');
const imageInfo = document.getElementById('imageInfo');
const compressArea = document.querySelector('.compress-area');
const compressBtn = document.getElementById('compressBtn');
const progressBar = document.querySelector('.progress');
const compressInfo = document.querySelector('.compress-info');
const batchProgress = document.querySelector('.batch-progress');
const batchStatus = document.querySelector('.batch-status');
const batchResult = document.querySelector('.batch-result');
const downloadAllBtn = document.getElementById('downloadAll');

let currentFile = null;
let compressedFiles = [];

// 处理拖放
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// 处理文件选择
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

folderInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// 处理文件
function handleFiles(files) {
    if (files.length === 0) return;

    compressedFiles = [];
    currentFile = null;
    
    if (files.length === 1) {
        // 单文件模式
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }
        currentFile = file;
        displayPreview(file);
    } else {
        // 批量模式
        let validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (validFiles.length === 0) {
            alert('没有找到有效的图片文件！');
            return;
        }
        currentFile = validFiles;
        imageInfo.textContent = `已选择 ${validFiles.length} 个图片文件`;
        preview.style.display = 'none';
    }
    
    compressArea.style.display = 'block';
}

// 显示预览
function displayPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        imageInfo.textContent = `文件名: ${file.name}\n大小: ${formatFileSize(file.size)}`;
    };
    reader.readAsDataURL(file);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 压缩图片
compressBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const quality = parseFloat(document.getElementById('quality').value);
    const colorMode = document.getElementById('colorMode').value;
    
    // 显示进度条
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.display = 'block';
    const progress = progressBar.querySelector('.progress');
    
    // 设置初始进度
    progress.style.width = '0%';
    
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: quality,
        alwaysKeepResolution: false,
        onProgress: (percent) => {
            // 更新进度条
            progress.style.width = `${percent}%`;
            // 添加进度文字
            compressInfo.textContent = `压缩进度: ${Math.round(percent)}%`;
        }
    };

    // 根据色彩模式调整压缩参数
    if (colorMode === 'low') {
        options.maxSizeMB = 0.5;         // 低质量：0.5MB
        options.maxWidthOrHeight = 1280;
        options.initialQuality = 0.3;     // 更激进的压缩
    } else if (colorMode === 'normal') {
        options.maxSizeMB = 0.8;         // 标准：0.8MB
        options.maxWidthOrHeight = 1600;
        options.initialQuality = 0.5;
    } else if (colorMode === 'high') {
        options.maxSizeMB = 1;           // 高质量：1MB
        options.maxWidthOrHeight = 1920;
        options.initialQuality = 0.7;
    }

    compressBtn.disabled = true;

    try {
        if (Array.isArray(currentFile)) {
            // 批量压缩
            batchProgress.style.display = 'block';
            const totalFiles = currentFile.length;
            
            for (let i = 0; i < totalFiles; i++) {
                batchStatus.textContent = `正在处理: ${i + 1}/${totalFiles} (${Math.round((i + 1) / totalFiles * 100)}%)`;
                const progress = ((i + 1) / totalFiles) * 100;
                batchProgress.querySelector('.progress').style.width = `${progress}%`;
                
                const compressedFile = await compressFile(currentFile[i], options);
                compressedFiles.push({
                    file: compressedFile,
                    originalName: currentFile[i].name
                });
            }

            batchResult.style.display = 'block';
            compressInfo.textContent = `已完成 ${totalFiles} 个文件的压缩`;
        } else {
            // 单文件压缩
            const compressedFile = await compressFile(currentFile, options);
            displayResult(compressedFile);
        }
    } catch (error) {
        console.error(error);
        alert('压缩过程中出现错误！');
    }

    compressBtn.disabled = false;
    // 完成后隐藏进度条
    progressBar.style.display = 'none';
});

// 压缩单个文件
async function compressFile(file, options) {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
}

// 显示压缩结果
function displayResult(compressedFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        compressInfo.textContent = `原始大小: ${formatFileSize(currentFile.size)}\n压缩后大小: ${formatFileSize(compressedFile.size)}\n压缩率: ${Math.round((1 - compressedFile.size / currentFile.size) * 100)}%`;
        
        // 创建下载链接
        const downloadBtn = document.createElement('a');
        downloadBtn.href = e.target.result;
        downloadBtn.download = 'compressed_' + currentFile.name;
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '下载压缩后的图片';
        
        // 移除旧的下载按钮
        const oldBtn = compressInfo.nextElementSibling;
        if (oldBtn && oldBtn.classList.contains('download-btn')) {
            oldBtn.remove();
        }
        
        compressInfo.insertAdjacentElement('afterend', downloadBtn);
    };
    reader.readAsDataURL(compressedFile);
}

// 批量下载
downloadAllBtn.addEventListener('click', async () => {
    if (compressedFiles.length === 0) return;

    const zip = new JSZip();
    
    // 添加所有文件到zip
    compressedFiles.forEach(({file, originalName}) => {
        zip.file('compressed_' + originalName, file);
    });
    
    // 生成并下载zip
    const content = await zip.generateAsync({type: 'blob'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'compressed_images.zip';
    link.click();
    URL.revokeObjectURL(link.href);
});
